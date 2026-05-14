import type { RetrievalResult } from '../types/RetrievalTypes.js';

export class RetrievalCache {
  private readonly cache = new Map<string, RetrievalResult>();

  public get(query: string): RetrievalResult | null {
    return this.cache.get(this.normalizeKey(query)) ?? null;
  }

  public set(query: string, result: RetrievalResult): void {
    this.cache.set(this.normalizeKey(query), result);
  }

  public clear(): void {
    this.cache.clear();
  }

  private normalizeKey(query: string): string {
    return query.trim().toLowerCase();
  }
}
