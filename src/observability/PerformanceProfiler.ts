import { SensitiveDataRedactor } from './SensitiveDataRedactor.js';
import type { PerformanceProfile } from '../types/ObservabilityTypes.js';

export interface PerformanceProfilerOptions {
  redactor?: SensitiveDataRedactor | undefined;
}

export class PerformanceProfiler {
  private readonly profiles = new Map<string, PerformanceProfile>();
  private readonly redactor: SensitiveDataRedactor;

  public constructor(options: PerformanceProfilerOptions = {}) {
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
  }

  public start(input: {
    operation: string;
    source: string;
    metadata?: unknown;
  }): PerformanceProfile {
    const timestamp = new Date().toISOString();

    const profile: PerformanceProfile = {
      id: `profile-${timestamp.replaceAll(':', '').replaceAll('.', '')}-${this.profiles.size + 1}`,
      operation: input.operation,
      source: input.source,
      status: 'running',
      startedAt: timestamp,
    };

    if (typeof input.metadata !== 'undefined') {
      profile.metadata = this.redactor.redactObject(input.metadata);
    }

    this.profiles.set(profile.id, profile);

    return profile;
  }

  public complete(id: string): PerformanceProfile {
    return this.finish(id, 'completed');
  }

  public fail(id: string): PerformanceProfile {
    return this.finish(id, 'failed');
  }

  public async measure<TValue>(
    input: {
      operation: string;
      source: string;
      metadata?: unknown;
    },
    task: () => Promise<TValue>,
  ): Promise<TValue> {
    const profile = this.start(input);

    try {
      const result = await task();
      this.complete(profile.id);

      return result;
    } catch (error) {
      this.fail(profile.id);
      throw error;
    }
  }

  public list(): PerformanceProfile[] {
    return [...this.profiles.values()];
  }

  public clear(): void {
    this.profiles.clear();
  }

  private finish(id: string, status: 'completed' | 'failed'): PerformanceProfile {
    const profile = this.profiles.get(id);

    if (!profile) {
      throw new Error(`Performance profile "${id}" was not found.`);
    }

    const completedAt = new Date().toISOString();

    const updated: PerformanceProfile = {
      ...profile,
      status,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(profile.startedAt).getTime(),
    };

    this.profiles.set(id, updated);

    return updated;
  }
}
