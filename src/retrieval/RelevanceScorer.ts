import type { ProjectChunk, ScoredChunk } from '../types/RetrievalTypes.js';

export class RelevanceScorer {
  public score(query: string, chunks: ProjectChunk[]): ScoredChunk[] {
    const terms = this.extractTerms(query);

    return chunks
      .map((chunk) => this.scoreChunk(chunk, terms))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  private scoreChunk(chunk: ProjectChunk, terms: string[]): ScoredChunk {
    const haystack = `${chunk.filePath}\n${chunk.content}`.toLowerCase();
    const matchedTerms = terms.filter((term) => haystack.includes(term));

    const pathBoost = terms.some((term) => chunk.filePath.toLowerCase().includes(term)) ? 3 : 0;
    const exactMatches = matchedTerms.length;
    const densityBoost = matchedTerms.length / Math.max(1, chunk.characterCount / 1000);

    return {
      chunk,
      score: Number((exactMatches * 10 + pathBoost + densityBoost).toFixed(4)),
      matchedTerms,
    };
  }

  private extractTerms(query: string): string[] {
    return [
      ...new Set(
        query
          .toLowerCase()
          .split(/[^a-z0-9_.-]+/i)
          .map((term) => term.trim())
          .filter((term) => term.length >= 3),
      ),
    ];
  }
}
