import { SensitiveDataRedactor } from './SensitiveDataRedactor.js';
import type { RuntimeDecisionLogEntry } from '../types/ObservabilityTypes.js';

export interface DecisionLogViewerOptions {
  redactor?: SensitiveDataRedactor | undefined;
}

export class DecisionLogViewer {
  private readonly entries: RuntimeDecisionLogEntry[] = [];
  private readonly redactor: SensitiveDataRedactor;

  public constructor(options: DecisionLogViewerOptions = {}) {
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
  }

  public record(input: {
    source: string;
    decision: string;
    reason: string;
    metadata?: unknown;
  }): RuntimeDecisionLogEntry {
    const timestamp = new Date().toISOString();

    const entry: RuntimeDecisionLogEntry = {
      id: `decision-${timestamp.replaceAll(':', '').replaceAll('.', '')}-${this.entries.length + 1}`,
      source: input.source,
      decision: input.decision,
      reason: input.reason,
      createdAt: timestamp,
    };

    if (typeof input.metadata !== 'undefined') {
      entry.metadata = this.redactor.redactObject(input.metadata);
    }

    this.entries.push(entry);

    return entry;
  }

  public list(): RuntimeDecisionLogEntry[] {
    return [...this.entries];
  }

  public bySource(source: string): RuntimeDecisionLogEntry[] {
    return this.entries.filter((entry) => entry.source === source);
  }

  public clear(): void {
    this.entries.length = 0;
  }
}
