import path from 'node:path';
import type {
  CodeSymbolScanResult,
  RelatedFile,
  RelatedFileReason,
  RelatedFilesResolverInput,
  TypeReferenceScanResult,
} from '../types/CodeIntelligenceTypes.js';

interface CandidateRelatedFile {
  filePath: string;
  score: number;
  reasons: Set<RelatedFileReason>;
}

export class RelatedFilesResolver {
  public resolve(input: RelatedFilesResolverInput): RelatedFile[] {
    const candidates = new Map<string, CandidateRelatedFile>();
    const maxRelatedFiles = input.maxRelatedFiles ?? 8;

    for (const item of input.imports) {
      if (!item.resolvedPath || item.resolvedPath === input.filePath) {
        continue;
      }

      this.addCandidate(candidates, item.resolvedPath, 80, 'direct_import');
    }

    for (const importer of input.importedBy) {
      if (importer === input.filePath) {
        continue;
      }

      this.addCandidate(candidates, importer, 70, 'importer');
    }

    for (const chunk of input.retrievalChunks) {
      const chunkFilePath = chunk.chunk.filePath;

      if (chunkFilePath === input.filePath) {
        continue;
      }

      this.addCandidate(
        candidates,
        chunkFilePath,
        Math.max(1, Math.min(chunk.score, 40)),
        'retrieval_match',
      );
    }

    this.addSharedSymbolCandidates(candidates, input);
    this.addSharedTypeReferenceCandidates(candidates, input);
    this.addSameDirectoryCandidates(candidates, input);
    this.addNearbyIndexCandidates(candidates, input);

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
      })
      .slice(0, maxRelatedFiles);
  }

  private addSharedSymbolCandidates(
    candidates: Map<string, CandidateRelatedFile>,
    input: RelatedFilesResolverInput,
  ): void {
    const symbolFiles = input.exportedSymbols ?? [];
    const targetImports = this.findSymbolResult(symbolFiles, input.filePath)?.imports ?? [];
    const importedNames = new Set(targetImports.map((symbol) => symbol.name));

    if (importedNames.size === 0) {
      return;
    }

    for (const symbolFile of symbolFiles) {
      if (symbolFile.filePath === input.filePath) {
        continue;
      }

      const sharesExportedSymbol = symbolFile.exports.some((symbol) =>
        importedNames.has(symbol.name),
      );

      if (sharesExportedSymbol) {
        this.addCandidate(candidates, symbolFile.filePath, 35, 'shared_symbol');
      }
    }
  }

  private addSharedTypeReferenceCandidates(
    candidates: Map<string, CandidateRelatedFile>,
    input: RelatedFilesResolverInput,
  ): void {
    const typeReferenceFiles = input.typeReferences ?? [];
    const targetReferences = new Set(
      this.findTypeReferenceResult(typeReferenceFiles, input.filePath)?.references.map(
        (reference) => reference.name,
      ) ?? [],
    );

    if (targetReferences.size === 0) {
      return;
    }

    for (const typeReferenceFile of typeReferenceFiles) {
      if (typeReferenceFile.filePath === input.filePath) {
        continue;
      }

      const sharedCount = typeReferenceFile.references.filter((reference) => {
        return targetReferences.has(reference.name);
      }).length;

      if (sharedCount > 0) {
        this.addCandidate(
          candidates,
          typeReferenceFile.filePath,
          Math.min(30, sharedCount * 5),
          'shared_type_reference',
        );
      }
    }
  }

  private addSameDirectoryCandidates(
    candidates: Map<string, CandidateRelatedFile>,
    input: RelatedFilesResolverInput,
  ): void {
    const targetDirectory = path.posix.dirname(input.filePath);

    for (const chunk of input.retrievalChunks) {
      const chunkFilePath = chunk.chunk.filePath;

      if (chunkFilePath === input.filePath) {
        continue;
      }

      if (path.posix.dirname(chunkFilePath) === targetDirectory) {
        this.addCandidate(candidates, chunkFilePath, 15, 'same_directory');
      }
    }
  }

  private addNearbyIndexCandidates(
    candidates: Map<string, CandidateRelatedFile>,
    input: RelatedFilesResolverInput,
  ): void {
    const targetDirectory = path.posix.dirname(input.filePath);
    const indexCandidates = [
      `${targetDirectory}/index.ts`,
      `${targetDirectory}/index.tsx`,
      `${targetDirectory}/index.js`,
      `${targetDirectory}/index.jsx`,
    ];

    for (const indexCandidate of indexCandidates) {
      if (indexCandidate === input.filePath) {
        continue;
      }

      const alreadyKnown =
        input.imports.some((item) => item.resolvedPath === indexCandidate) ||
        input.importedBy.includes(indexCandidate) ||
        input.retrievalChunks.some((chunk) => chunk.chunk.filePath === indexCandidate);

      if (alreadyKnown) {
        this.addCandidate(candidates, indexCandidate, 20, 'nearby_index_file');
      }
    }
  }

  private findSymbolResult(
    results: CodeSymbolScanResult[],
    filePath: string,
  ): CodeSymbolScanResult | undefined {
    return results.find((result) => result.filePath === filePath);
  }

  private findTypeReferenceResult(
    results: TypeReferenceScanResult[],
    filePath: string,
  ): TypeReferenceScanResult | undefined {
    return results.find((result) => result.filePath === filePath);
  }

  private addCandidate(
    candidates: Map<string, CandidateRelatedFile>,
    filePath: string,
    score: number,
    reason: RelatedFileReason,
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
