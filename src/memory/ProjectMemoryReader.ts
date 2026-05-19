import type { RuntimeContextSource } from '../types/ContextTypes.js';
import type { ProjectMemoryStore } from './ProjectMemoryStore.js';
import type {
  ProjectKnownFileMemory,
  ProjectMemoryDocument,
  ProjectMemoryEntry,
  ProjectMemoryEntryKind,
  ProjectMemoryImportance,
} from './ProjectMemoryTypes.js';

export interface ProjectMemoryReaderOptions {
  store: ProjectMemoryStore;
  maxEntries?: number | undefined;
  maxKnownFiles?: number | undefined;
  minImportance?: ProjectMemoryImportance | undefined;
  sourceName?: string | undefined;
}

export interface ProjectMemoryContextInput {
  tags?: string[] | undefined;
  kinds?: ProjectMemoryEntryKind[] | undefined;
  minImportance?: ProjectMemoryImportance | undefined;
  maxEntries?: number | undefined;
  maxKnownFiles?: number | undefined;
}

const importanceRank: Record<ProjectMemoryImportance, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export class ProjectMemoryReader {
  private readonly store: ProjectMemoryStore;
  private readonly maxEntries: number;
  private readonly maxKnownFiles: number;
  private readonly minImportance: ProjectMemoryImportance;
  private readonly sourceName: string;

  public constructor(options: ProjectMemoryReaderOptions) {
    this.store = options.store;
    this.maxEntries = options.maxEntries ?? 24;
    this.maxKnownFiles = options.maxKnownFiles ?? 16;
    this.minImportance = options.minImportance ?? 'medium';
    this.sourceName = options.sourceName ?? '.runtime/project-memory.json';
  }

  public async readDocument(): Promise<ProjectMemoryDocument> {
    return this.store.load();
  }

  public async readContextSource(
    input: ProjectMemoryContextInput = {},
  ): Promise<RuntimeContextSource | null> {
    const document = await this.store.load();
    const content = this.renderContext(document, input);

    if (!content.trim()) {
      return null;
    }

    return {
      name: this.sourceName,
      content,
      priority: 'medium',
    };
  }

  private renderContext(document: ProjectMemoryDocument, input: ProjectMemoryContextInput): string {
    const minImportance = input.minImportance ?? this.minImportance;
    const maxEntries = input.maxEntries ?? this.maxEntries;
    const maxKnownFiles = input.maxKnownFiles ?? this.maxKnownFiles;
    const tags = new Set((input.tags ?? []).map((tag) => tag.trim().toLowerCase()));
    const kinds = new Set(input.kinds ?? []);

    const entries = document.entries
      .filter((entry) => this.matchesEntry(entry, minImportance, tags, kinds))
      .slice(-maxEntries);

    const knownFiles = document.knownFiles
      .filter((file) => this.matchesKnownFile(file, minImportance, tags))
      .slice(-maxKnownFiles);

    if (entries.length === 0 && knownFiles.length === 0) {
      return '';
    }

    return [
      '# Project Memory',
      '',
      `Project: ${document.projectName}`,
      `Updated at: ${document.updatedAt}`,
      '',
      '## Memory entries',
      '',
      this.renderEntries(entries),
      '',
      '## Known files',
      '',
      this.renderKnownFiles(knownFiles),
    ].join('\n');
  }

  private matchesEntry(
    entry: ProjectMemoryEntry,
    minImportance: ProjectMemoryImportance,
    tags: ReadonlySet<string>,
    kinds: ReadonlySet<ProjectMemoryEntryKind>,
  ): boolean {
    if (importanceRank[entry.importance] < importanceRank[minImportance]) {
      return false;
    }

    if (kinds.size > 0 && !kinds.has(entry.kind)) {
      return false;
    }

    if (tags.size > 0 && !entry.tags.some((tag) => tags.has(tag.toLowerCase()))) {
      return false;
    }

    return true;
  }

  private matchesKnownFile(
    file: ProjectKnownFileMemory,
    minImportance: ProjectMemoryImportance,
    tags: ReadonlySet<string>,
  ): boolean {
    if (importanceRank[file.importance] < importanceRank[minImportance]) {
      return false;
    }

    if (tags.size > 0 && !file.tags.some((tag) => tags.has(tag.toLowerCase()))) {
      return false;
    }

    return true;
  }

  private renderEntries(entries: readonly ProjectMemoryEntry[]): string {
    if (entries.length === 0) {
      return '- none';
    }

    return entries
      .map((entry) => {
        const source = entry.source ? `\n  Source: ${entry.source}` : '';

        return `- [${entry.importance}] ${entry.kind}: ${entry.title}
  Tags: ${entry.tags.join(', ') || 'none'}${source}
  ${this.indentContent(entry.content)}`;
      })
      .join('\n');
  }

  private renderKnownFiles(files: readonly ProjectKnownFileMemory[]): string {
    if (files.length === 0) {
      return '- none';
    }

    return files
      .map((file) => {
        return `- [${file.importance}] ${file.path}
  Tags: ${file.tags.join(', ') || 'none'}
  ${this.indentContent(file.summary)}`;
      })
      .join('\n');
  }

  private indentContent(value: string): string {
    return value
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n');
  }
}
