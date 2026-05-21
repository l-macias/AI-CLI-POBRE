import type { JsonObject } from '../types/SharedTypes.js';
import type { ProjectMemoryStore } from './ProjectMemoryStore.js';
import type {
  ProjectMemoryDocument,
  ProjectMemoryImportance,
  ProjectMemoryQueryResult,
  ProjectMemoryTrustLevel,
} from './ProjectMemoryTypes.js';

export interface ProjectDecisionLogOptions {
  store: ProjectMemoryStore;
}

export interface ProjectDecisionInput {
  title: string;
  decision: string;
  rationale: string;
  alternatives?: string[] | undefined;
  consequences?: string[] | undefined;
  importance?: ProjectMemoryImportance | undefined;
  trustLevel?: ProjectMemoryTrustLevel | undefined;
  tags?: string[] | undefined;
  source?: string | undefined;
  metadata?: JsonObject | undefined;
}

export interface ProjectDecisionQueryInput {
  tags?: string[] | undefined;
  minImportance?: ProjectMemoryImportance | undefined;
  limit?: number | undefined;
}

export class ProjectDecisionLog {
  private readonly store: ProjectMemoryStore;

  public constructor(options: ProjectDecisionLogOptions) {
    this.store = options.store;
  }

  public async recordDecision(input: ProjectDecisionInput): Promise<ProjectMemoryDocument> {
    return this.store.appendDecision({
      title: input.title,
      content: this.renderDecision(input),
      importance: input.importance ?? 'high',
      trustLevel: input.trustLevel ?? 'runtime-generated',
      tags: this.normalizeTags(['decision', ...(input.tags ?? [])]),
      source: input.source,
      metadata: input.metadata,
    });
  }

  public async queryDecisions(
    input: ProjectDecisionQueryInput = {},
  ): Promise<ProjectMemoryQueryResult> {
    return this.store.query({
      kinds: ['decision'],
      tags: input.tags,
      minImportance: input.minImportance,
      limit: input.limit,
    });
  }

  private renderDecision(input: ProjectDecisionInput): string {
    return [
      `Decision: ${input.decision.trim()}`,
      '',
      `Rationale: ${input.rationale.trim()}`,
      '',
      'Alternatives:',
      this.renderList(input.alternatives),
      '',
      'Consequences:',
      this.renderList(input.consequences),
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
