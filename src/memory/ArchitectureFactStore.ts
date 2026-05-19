import type { JsonObject } from '../types/SharedTypes.js';
import type { ProjectMemoryStore } from './ProjectMemoryStore.js';
import type {
  ProjectMemoryDocument,
  ProjectMemoryImportance,
  ProjectMemoryQueryResult,
} from './ProjectMemoryTypes.js';

export interface ArchitectureFactStoreOptions {
  store: ProjectMemoryStore;
}

export interface ArchitectureFactInput {
  title: string;
  summary: string;
  details?: string[] | undefined;
  importance?: ProjectMemoryImportance | undefined;
  tags?: string[] | undefined;
  source?: string | undefined;
  metadata?: JsonObject | undefined;
}

export interface ArchitectureConstraintInput {
  title: string;
  rule: string;
  reason: string;
  enforcement?: string[] | undefined;
  importance?: ProjectMemoryImportance | undefined;
  tags?: string[] | undefined;
  source?: string | undefined;
  metadata?: JsonObject | undefined;
}

export interface ArchitectureKnownFileInput {
  path: string;
  summary: string;
  importance?: ProjectMemoryImportance | undefined;
  tags?: string[] | undefined;
  metadata?: JsonObject | undefined;
}

export interface ArchitectureMemoryQueryInput {
  tags?: string[] | undefined;
  minImportance?: ProjectMemoryImportance | undefined;
  limit?: number | undefined;
}

export class ArchitectureFactStore {
  private readonly store: ProjectMemoryStore;

  public constructor(options: ArchitectureFactStoreOptions) {
    this.store = options.store;
  }

  public async recordFact(input: ArchitectureFactInput): Promise<ProjectMemoryDocument> {
    return this.store.appendFact({
      title: input.title,
      content: this.renderFact(input),
      importance: input.importance ?? 'medium',
      tags: this.normalizeTags(['architecture', 'fact', ...(input.tags ?? [])]),
      source: input.source,
      metadata: input.metadata,
    });
  }

  public async recordConstraint(
    input: ArchitectureConstraintInput,
  ): Promise<ProjectMemoryDocument> {
    return this.store.appendConstraint({
      title: input.title,
      content: this.renderConstraint(input),
      importance: input.importance ?? 'critical',
      tags: this.normalizeTags(['architecture', 'constraint', ...(input.tags ?? [])]),
      source: input.source,
      metadata: input.metadata,
    });
  }

  public async rememberKnownFile(
    input: ArchitectureKnownFileInput,
  ): Promise<ProjectMemoryDocument> {
    return this.store.upsertKnownFile({
      path: input.path,
      summary: input.summary,
      importance: input.importance ?? 'medium',
      tags: this.normalizeTags(['architecture', 'known-file', ...(input.tags ?? [])]),
      metadata: input.metadata,
    });
  }

  public async queryArchitectureMemory(
    input: ArchitectureMemoryQueryInput = {},
  ): Promise<ProjectMemoryQueryResult> {
    return this.store.query({
      tags: input.tags,
      minImportance: input.minImportance,
      limit: input.limit,
    });
  }

  private renderFact(input: ArchitectureFactInput): string {
    return [
      `Summary: ${input.summary.trim()}`,
      '',
      'Details:',
      this.renderList(input.details),
    ].join('\n');
  }

  private renderConstraint(input: ArchitectureConstraintInput): string {
    return [
      `Rule: ${input.rule.trim()}`,
      '',
      `Reason: ${input.reason.trim()}`,
      '',
      'Enforcement:',
      this.renderList(input.enforcement),
    ].join('\n');
  }

  private renderList(items: readonly string[] | undefined): string {
    const normalized = (items ?? []).map((item) => item.trim()).filter(Boolean);

    if (normalized.length === 0) {
      return '- none';
    }

    return normalized.map((item) => `- ${item}`).join('\n');
  }

  private normalizeTags(tags: readonly string[]): string[] {
    return [
      ...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)),
    ];
  }
}
