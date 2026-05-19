import { SensitiveDataRedactor } from './SensitiveDataRedactor.js';
import type { TimelineEntry, TimelineEntryStatus } from '../types/ObservabilityTypes.js';

export interface ExecutionTimelineOptions {
  redactor?: SensitiveDataRedactor | undefined;
}

export class ExecutionTimeline {
  private readonly entries: TimelineEntry[] = [];
  private readonly redactor: SensitiveDataRedactor;

  public constructor(options: ExecutionTimelineOptions = {}) {
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
  }

  public start(input: { label: string; source: string; metadata?: unknown }): TimelineEntry {
    const timestamp = new Date().toISOString();

    const entry: TimelineEntry = {
      id: `timeline-${timestamp.replaceAll(':', '').replaceAll('.', '')}-${this.entries.length + 1}`,
      label: input.label,
      source: input.source,
      status: 'started',
      startedAt: timestamp,
    };

    if (typeof input.metadata !== 'undefined') {
      entry.metadata = this.redactor.redactObject(input.metadata);
    }

    this.entries.push(entry);

    return entry;
  }

  public complete(input: {
    id: string;
    status?: Exclude<TimelineEntryStatus, 'started'> | undefined;
    metadata?: unknown;
  }): TimelineEntry {
    const entry = this.requireEntry(input.id);
    const completedAt = new Date().toISOString();

    const updated: TimelineEntry = {
      ...entry,
      status: input.status ?? 'completed',
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(entry.startedAt).getTime(),
    };

    if (typeof input.metadata !== 'undefined') {
      updated.metadata = {
        ...(entry.metadata ?? {}),
        ...this.redactor.redactObject(input.metadata),
      };
    }

    this.replace(updated);

    return updated;
  }

  public list(): TimelineEntry[] {
    return [...this.entries];
  }

  public clear(): void {
    this.entries.length = 0;
  }

  private requireEntry(id: string): TimelineEntry {
    const entry = this.entries.find((candidate) => candidate.id === id);

    if (!entry) {
      throw new Error(`Timeline entry "${id}" was not found.`);
    }

    return entry;
  }

  private replace(entry: TimelineEntry): void {
    const index = this.entries.findIndex((candidate) => candidate.id === entry.id);

    if (index === -1) {
      throw new Error(`Timeline entry "${entry.id}" was not found.`);
    }

    this.entries[index] = entry;
  }
}
