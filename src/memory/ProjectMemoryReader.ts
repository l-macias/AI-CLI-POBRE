import type { RuntimeContextSource } from '../types/ContextTypes.js';
import type { ProjectMemoryStore } from './ProjectMemoryStore.js';
import type {
  ProjectKnownFileMemory,
  ProjectMemoryDocument,
  ProjectMemoryEntry,
  ProjectMemoryEntryKind,
  ProjectMemoryImportance,
  ProjectMemoryTrustLevel,
} from './ProjectMemoryTypes.js';

export interface ProjectMemoryReaderOptions {
  store: ProjectMemoryStore;
  maxEntries?: number | undefined;
  maxKnownFiles?: number | undefined;
  minImportance?: ProjectMemoryImportance | undefined;
  trustedLevels?: ProjectMemoryTrustLevel[] | undefined;
  sourceName?: string | undefined;
}

export interface ProjectMemoryContextInput {
  tags?: string[] | undefined;
  kinds?: ProjectMemoryEntryKind[] | undefined;
  minImportance?: ProjectMemoryImportance | undefined;
  maxEntries?: number | undefined;
  maxKnownFiles?: number | undefined;
  trustedLevels?: ProjectMemoryTrustLevel[] | undefined;
  includeProviderSuggested?: boolean | undefined;
  includeQuarantined?: boolean | undefined;
}

const importanceRank: Record<ProjectMemoryImportance, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const defaultTrustedLevels: ProjectMemoryTrustLevel[] = ['user-approved', 'runtime-generated'];

export class ProjectMemoryReader {
  private readonly store: ProjectMemoryStore;
  private readonly maxEntries: number;
  private readonly maxKnownFiles: number;
  private readonly minImportance: ProjectMemoryImportance;
  private readonly trustedLevels: ProjectMemoryTrustLevel[];
  private readonly sourceName: string;

  public constructor(options: ProjectMemoryReaderOptions) {
    this.store = options.store;
    this.maxEntries = options.maxEntries ?? 24;
    this.maxKnownFiles = options.maxKnownFiles ?? 16;
    this.minImportance = options.minImportance ?? 'medium';
    this.trustedLevels = options.trustedLevels ?? defaultTrustedLevels;
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
    const trustedLevels = this.resolveTrustedLevels(input);
    const tags = new Set((input.tags ?? []).map((tag) => tag.trim().toLowerCase()));
    const kinds = new Set(input.kinds ?? []);

    const entries = document.entries
      .filter((entry) => this.matchesEntry(entry, minImportance, tags, kinds, trustedLevels))
      .slice(-maxEntries);

    const knownFiles = document.knownFiles
      .filter((file) => this.matchesKnownFile(file, minImportance, tags, trustedLevels))
      .slice(-maxKnownFiles);

    if (entries.length === 0 && knownFiles.length === 0) {
      return '';
    }

    return [
      '# Project Memory',
      '',
      `Project: ${document.projectName}`,
      `Updated at: ${document.updatedAt}`,
      `Trusted levels included: ${trustedLevels.join(', ')}`,
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

  private resolveTrustedLevels(input: ProjectMemoryContextInput): ProjectMemoryTrustLevel[] {
    if (input.trustedLevels) {
      return input.trustedLevels;
    }

    const levels = new Set<ProjectMemoryTrustLevel>(this.trustedLevels);

    if (input.includeProviderSuggested === true) {
      levels.add('provider-suggested');
    }

    if (input.includeQuarantined === true) {
      levels.add('quarantined');
    }

    return [...levels];
  }

  private matchesEntry(
    entry: ProjectMemoryEntry,
    minImportance: ProjectMemoryImportance,
    tags: ReadonlySet<string>,
    kinds: ReadonlySet<ProjectMemoryEntryKind>,
    trustedLevels: readonly ProjectMemoryTrustLevel[],
  ): boolean {
    if (!trustedLevels.includes(entry.trustLevel)) {
      return false;
    }

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
    trustedLevels: readonly ProjectMemoryTrustLevel[],
  ): boolean {
    if (!trustedLevels.includes(file.trustLevel)) {
      return false;
    }

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
  Trust: ${entry.trustLevel}
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
  Trust: ${file.trustLevel}
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
