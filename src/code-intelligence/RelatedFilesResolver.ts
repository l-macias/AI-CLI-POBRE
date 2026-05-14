import type { RelatedFile, RelatedFilesResolverInput } from '../types/CodeIntelligenceTypes.js';

interface CandidateRelatedFile {
  filePath: string;
  score: number;
  reasons: Set<string>;
}

export class RelatedFilesResolver {
  public resolve(input: RelatedFilesResolverInput): RelatedFile[] {
    const candidates = new Map<string, CandidateRelatedFile>();

    for (const item of input.imports) {
      if (!item.resolvedPath || item.resolvedPath === input.filePath) {
        continue;
      }

      this.addCandidate(candidates, item.resolvedPath, 50, 'direct_import');
    }

    for (const importer of input.importedBy) {
      if (importer === input.filePath) {
        continue;
      }

      this.addCandidate(candidates, importer, 60, 'importer');
    }

    for (const chunk of input.retrievalChunks) {
      const chunkFilePath = chunk.chunk.filePath;

      if (chunkFilePath === input.filePath) {
        continue;
      }

      this.addCandidate(candidates, chunkFilePath, Math.max(1, chunk.score), 'retrieval_match');
    }

    return [...candidates.values()]
      .map((candidate) => ({
        filePath: candidate.filePath,
        score: candidate.score,
        reasons: [...candidate.reasons].sort(),
      }))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.filePath.localeCompare(right.filePath);
      });
  }

  private addCandidate(
    candidates: Map<string, CandidateRelatedFile>,
    filePath: string,
    score: number,
    reason: string,
  ): void {
    const current = candidates.get(filePath);

    if (!current) {
      candidates.set(filePath, {
        filePath,
        score,
        reasons: new Set([reason]),
      });

      return;
    }

    current.score += score;
    current.reasons.add(reason);
  }
}
