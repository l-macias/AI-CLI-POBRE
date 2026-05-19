import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { safeJsonParse } from '../utils/safeJson.js';
import { ProjectMemorySanitizer } from './ProjectMemorySanitizer.js';
import type {
  ProjectKnownFileMemory,
  ProjectMemoryAppendInput,
  ProjectMemoryDocument,
  ProjectMemoryEntry,
  ProjectMemoryEntryKind,
  ProjectMemoryImportance,
  ProjectMemoryKnownFileInput,
  ProjectMemoryQueryInput,
  ProjectMemoryQueryResult,
  ProjectMemoryStoreOptions,
} from './ProjectMemoryTypes.js';

const defaultProjectMemoryFileName = 'project-memory.json';

const importanceRank: Record<ProjectMemoryImportance, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export interface ProjectMemoryStoreDependencies {
  sanitizer?: ProjectMemorySanitizer | undefined;
}

export class ProjectMemoryStore {
  private readonly projectRoot: string;
  private readonly projectName: string;
  private readonly fileName: string;
  private readonly sanitizer: ProjectMemorySanitizer;

  public constructor(
    options: ProjectMemoryStoreOptions,
    dependencies: ProjectMemoryStoreDependencies = {},
  ) {
    this.projectRoot = resolve(options.projectRoot);
    this.projectName = options.projectName ?? 'target-project';
    this.fileName = options.fileName ?? defaultProjectMemoryFileName;
    this.sanitizer = dependencies.sanitizer ?? new ProjectMemorySanitizer();
  }

  public async load(): Promise<ProjectMemoryDocument> {
    const path = this.getMemoryFilePath();

    try {
      const content = await readFile(path, 'utf8');
      const parsed = safeJsonParse(content);

      if (!parsed.ok) {
        throw new Error(`Project memory JSON parse failed: ${parsed.error.message}`);
      }

      return this.normalizeDocument(parsed.value);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        const created = this.createEmptyDocument();
        await this.save(created);

        return created;
      }

      throw error;
    }
  }

  public async save(document: ProjectMemoryDocument): Promise<ProjectMemoryDocument> {
    const normalized = this.normalizeDocument({
      ...document,
      projectRoot: this.projectRoot,
      projectName: document.projectName || this.projectName,
      updatedAt: new Date().toISOString(),
    });

    const path = this.getMemoryFilePath();

    await mkdir(dirname(path), {
      recursive: true,
    });

    await writeFile(path, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');

    return normalized;
  }

  public async append(input: ProjectMemoryAppendInput): Promise<ProjectMemoryDocument> {
    this.sanitizer.assertSafeMemoryInput({
      title: input.title,
      content: input.content,
      source: input.source,
    });

    const document = await this.load();
    const now = new Date().toISOString();
    const entry = this.createEntry(input, now);

    return this.save({
      ...document,
      entries: [...document.entries, entry],
      updatedAt: now,
    });
  }

  public async appendFact(
    input: Omit<ProjectMemoryAppendInput, 'kind'>,
  ): Promise<ProjectMemoryDocument> {
    return this.append({
      ...input,
      kind: 'fact',
    });
  }

  public async appendDecision(
    input: Omit<ProjectMemoryAppendInput, 'kind'>,
  ): Promise<ProjectMemoryDocument> {
    return this.append({
      ...input,
      kind: 'decision',
    });
  }

  public async appendConstraint(
    input: Omit<ProjectMemoryAppendInput, 'kind'>,
  ): Promise<ProjectMemoryDocument> {
    return this.append({
      ...input,
      kind: 'constraint',
    });
  }

  public async appendSessionNote(
    input: Omit<ProjectMemoryAppendInput, 'kind'>,
  ): Promise<ProjectMemoryDocument> {
    return this.append({
      ...input,
      kind: 'session_note',
    });
  }

  public async upsertKnownFile(input: ProjectMemoryKnownFileInput): Promise<ProjectMemoryDocument> {
    this.sanitizer.assertSafePath(input.path);
    this.sanitizer.assertSafeMemoryInput({
      title: input.path,
      content: input.summary,
      source: input.path,
    });

    const document = await this.load();
    const now = new Date().toISOString();
    const normalizedPath = this.sanitizer.normalizeRelativePath(input.path);
    const existingIndex = document.knownFiles.findIndex((file) => file.path === normalizedPath);

    const knownFile: ProjectKnownFileMemory = {
      path: normalizedPath,
      summary: this.sanitizer.sanitizeText(input.summary),
      importance: input.importance ?? 'medium',
      tags: this.sanitizer.normalizeTags(input.tags),
      lastSeenAt: now,
    };

    const metadata = this.sanitizer.sanitizeMetadata(input.metadata);

    if (metadata) {
      knownFile.metadata = metadata;
    }

    const knownFiles =
      existingIndex >= 0
        ? document.knownFiles.map((file, index) => (index === existingIndex ? knownFile : file))
        : [...document.knownFiles, knownFile];

    return this.save({
      ...document,
      knownFiles,
      updatedAt: now,
    });
  }

  public async query(input: ProjectMemoryQueryInput = {}): Promise<ProjectMemoryQueryResult> {
    const document = await this.load();
    const kinds = new Set(input.kinds ?? []);
    const tags = new Set((input.tags ?? []).map((tag) => tag.trim().toLowerCase()));
    const minImportance = input.minImportance ?? 'low';
    const limit = input.limit ?? 50;

    const entries = document.entries
      .filter((entry) => {
        if (kinds.size > 0 && !kinds.has(entry.kind)) {
          return false;
        }

        if (importanceRank[entry.importance] < importanceRank[minImportance]) {
          return false;
        }

        if (tags.size > 0 && !entry.tags.some((tag) => tags.has(tag.toLowerCase()))) {
          return false;
        }

        return true;
      })
      .slice(-limit);

    const knownFiles = document.knownFiles
      .filter((file) => {
        if (importanceRank[file.importance] < importanceRank[minImportance]) {
          return false;
        }

        if (tags.size > 0 && !file.tags.some((tag) => tags.has(tag.toLowerCase()))) {
          return false;
        }

        return true;
      })
      .slice(-limit);

    return {
      entries,
      knownFiles,
    };
  }

  public getMemoryFilePath(): string {
    return join(this.projectRoot, '.runtime', this.fileName);
  }

  private createEmptyDocument(): ProjectMemoryDocument {
    const now = new Date().toISOString();

    return {
      version: 1,
      projectName: this.projectName,
      projectRoot: this.projectRoot,
      entries: [],
      knownFiles: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  private createEntry(input: ProjectMemoryAppendInput, now: string): ProjectMemoryEntry {
    const entry: ProjectMemoryEntry = {
      id: this.createEntryId(input.kind, now),
      kind: input.kind,
      title: this.sanitizer.sanitizeText(input.title),
      content: this.sanitizer.sanitizeText(input.content),
      importance: input.importance ?? 'medium',
      tags: this.sanitizer.normalizeTags(input.tags),
      createdAt: now,
      updatedAt: now,
    };

    const source = this.normalizeOptionalString(input.source);

    if (source) {
      this.sanitizer.assertSafePath(source);
      entry.source = this.sanitizer.normalizeRelativePath(source);
    }

    const metadata = this.sanitizer.sanitizeMetadata(input.metadata);

    if (metadata) {
      entry.metadata = metadata;
    }

    return entry;
  }

  private normalizeDocument(value: unknown): ProjectMemoryDocument {
    const record = this.asRecord(value);
    const now = new Date().toISOString();

    if (!record) {
      throw new Error('Project memory document must be an object.');
    }

    const version = record['version'];

    if (version !== 1) {
      throw new Error('Unsupported project memory document version.');
    }

    const createdAt = this.readString(record['createdAt']) ?? now;
    const updatedAt = this.readString(record['updatedAt']) ?? now;

    return {
      version: 1,
      projectName: this.readString(record['projectName']) ?? this.projectName,
      projectRoot: this.projectRoot,
      entries: this.readEntries(record['entries']),
      knownFiles: this.readKnownFiles(record['knownFiles']),
      createdAt,
      updatedAt,
    };
  }

  private readEntries(value: unknown): ProjectMemoryEntry[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => this.readEntry(item)).filter((entry) => entry !== null);
  }

  private readEntry(value: unknown): ProjectMemoryEntry | null {
    const record = this.asRecord(value);

    if (!record) {
      return null;
    }

    const kind = this.readEntryKind(record['kind']);
    const id = this.readString(record['id']);
    const title = this.readString(record['title']);
    const content = this.readString(record['content']);
    const createdAt = this.readString(record['createdAt']);
    const updatedAt = this.readString(record['updatedAt']);

    if (!kind || !id || !title || !content || !createdAt || !updatedAt) {
      return null;
    }

    const entry: ProjectMemoryEntry = {
      id,
      kind,
      title: this.sanitizer.sanitizeText(title),
      content: this.sanitizer.sanitizeText(content),
      importance: this.readImportance(record['importance']) ?? 'medium',
      tags: this.readTags(record['tags']),
      createdAt,
      updatedAt,
    };

    const source = this.readString(record['source']);

    if (source && !this.sanitizer.isBlockedPath(source)) {
      entry.source = this.sanitizer.normalizeRelativePath(source);
    }

    const metadata = this.sanitizer.sanitizeMetadata(
      this.sanitizer.readJsonObject(record['metadata']),
    );

    if (metadata) {
      entry.metadata = metadata;
    }

    return entry;
  }

  private readKnownFiles(value: unknown): ProjectKnownFileMemory[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => this.readKnownFile(item)).filter((file) => file !== null);
  }

  private readKnownFile(value: unknown): ProjectKnownFileMemory | null {
    const record = this.asRecord(value);

    if (!record) {
      return null;
    }

    const path = this.readString(record['path']);
    const summary = this.readString(record['summary']);
    const lastSeenAt = this.readString(record['lastSeenAt']);

    if (!path || !summary || !lastSeenAt || this.sanitizer.isBlockedPath(path)) {
      return null;
    }

    const knownFile: ProjectKnownFileMemory = {
      path: this.sanitizer.normalizeRelativePath(path),
      summary: this.sanitizer.sanitizeText(summary),
      importance: this.readImportance(record['importance']) ?? 'medium',
      tags: this.readTags(record['tags']),
      lastSeenAt,
    };

    const metadata = this.sanitizer.sanitizeMetadata(
      this.sanitizer.readJsonObject(record['metadata']),
    );

    if (metadata) {
      knownFile.metadata = metadata;
    }

    return knownFile;
  }

  private createEntryId(kind: ProjectMemoryEntryKind, timestamp: string): string {
    const normalizedTimestamp = timestamp.replaceAll(':', '').replaceAll('.', '');

    return `project-memory-${kind}-${normalizedTimestamp}`;
  }

  private readEntryKind(value: unknown): ProjectMemoryEntryKind | null {
    if (
      value === 'fact' ||
      value === 'decision' ||
      value === 'constraint' ||
      value === 'session_note' ||
      value === 'known_file'
    ) {
      return value;
    }

    return null;
  }

  private readImportance(value: unknown): ProjectMemoryImportance | null {
    if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') {
      return value;
    }

    return null;
  }

  private readTags(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return this.sanitizer.normalizeTags(
      value.filter((item): item is string => typeof item === 'string'),
    );
  }

  private readString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeOptionalString(value: string | undefined): string | undefined {
    const trimmed = value?.trim();

    if (!trimmed) {
      return undefined;
    }

    return trimmed;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private isNotFoundError(error: unknown): boolean {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT';
  }
}
