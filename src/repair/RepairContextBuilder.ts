import { CodeIntelligenceReport } from '../code-intelligence/CodeIntelligenceReport.js';
import { ContextRetriever } from '../retrieval/ContextRetriever.js';
import { FileIndexer } from '../retrieval/FileIndexer.js';
import { RealProjectTrialFileReader } from '../real-project-trial/RealProjectTrialFileReader.js';
import type { RelatedFile } from '../types/CodeIntelligenceTypes.js';
import type { RealProjectTrialErrorFinding } from '../types/RealProjectTrialTypes.js';
import type { RepairTargetFile } from '../types/RepairTypes.js';

export interface RepairContextBuilderInput {
  projectRoot: string;
  targetFiles: string[];
  findings: RealProjectTrialErrorFinding[];
  maxFileBytes?: number | undefined;
  includeRelatedContext?: boolean | undefined;
  maxRelatedFiles?: number | undefined;
  maxRelatedFileBytes?: number | undefined;
  maxTotalContextBytes?: number | undefined;
}

export interface RepairContextBuilderOptions {
  reader?: RealProjectTrialFileReader | undefined;
}

interface RelatedContextCandidate {
  filePath: string;
  score: number;
  reasons: string[];
  selectedFromTarget: string;
}

export class RepairContextBuilder {
  private readonly reader: RealProjectTrialFileReader;

  public constructor(options: RepairContextBuilderOptions = {}) {
    this.reader = options.reader ?? new RealProjectTrialFileReader();
  }

  public async build(input: RepairContextBuilderInput): Promise<RepairTargetFile[]> {
    const primaryTargets = this.normalizeTargetFiles(input.targetFiles);
    const results: RepairTargetFile[] = [];
    const maxTotalContextBytes = input.maxTotalContextBytes ?? 220_000;
    let remainingBytes = maxTotalContextBytes;

    for (const targetFile of primaryTargets) {
      const file = await this.reader.read({
        projectRoot: input.projectRoot,
        relativePath: targetFile,
        maxBytes: Math.min(input.maxFileBytes ?? 128_000, remainingBytes),
      });

      remainingBytes = Math.max(0, remainingBytes - file.bytes);

      results.push({
        relativePath: file.relativePath,
        exists: file.issues.length === 0,
        content: file.content,
        bytes: file.bytes,
        role: 'primary_target',
        editable: true,
        contextReasons: ['explicit_repair_target'],
        contextSelectionReason: 'Selected because it was explicitly requested as a repair target.',
        ...this.resolveRelevantRange(targetFile, input.findings),
      });
    }

    if (input.includeRelatedContext === false || remainingBytes <= 0) {
      return results;
    }

    const relatedCandidates = await this.resolveRelatedContextCandidates({
      projectRoot: input.projectRoot,
      targetFiles: primaryTargets,
      findings: input.findings,
      maxRelatedFiles: input.maxRelatedFiles ?? 4,
    });

    const alreadyIncluded = new Set(results.map((file) => file.relativePath));

    for (const candidate of relatedCandidates) {
      if (remainingBytes <= 0 || alreadyIncluded.has(candidate.filePath)) {
        continue;
      }

      const file = await this.reader.read({
        projectRoot: input.projectRoot,
        relativePath: candidate.filePath,
        maxBytes: Math.min(input.maxRelatedFileBytes ?? 48_000, remainingBytes),
      });

      remainingBytes = Math.max(0, remainingBytes - file.bytes);
      alreadyIncluded.add(file.relativePath);

      results.push({
        relativePath: file.relativePath,
        exists: file.issues.length === 0,
        content: file.content,
        bytes: file.bytes,
        role: 'related_context',
        editable: false,
        contextScore: candidate.score,
        contextReasons: candidate.reasons,
        contextSelectionReason: `Selected as related context for ${candidate.selectedFromTarget}. Reasons: ${
          candidate.reasons.join(', ') || 'relationship match'
        }.`,
        ...this.resolveRelevantRange(candidate.filePath, input.findings),
      });
    }

    return results;
  }

  private async resolveRelatedContextCandidates(input: {
    projectRoot: string;
    targetFiles: string[];
    findings: RealProjectTrialErrorFinding[];
    maxRelatedFiles: number;
  }): Promise<RelatedContextCandidate[]> {
    const indexer = new FileIndexer({
      rootDir: input.projectRoot,
    });

    const retriever = new ContextRetriever({
      indexer,
    });

    const intelligence = new CodeIntelligenceReport({
      indexer,
      retriever,
    });

    const candidates = new Map<string, RelatedContextCandidate>();

    for (const targetFile of input.targetFiles) {
      const report = await intelligence.generate({
        targetFilePath: targetFile,
        query: this.buildIntelligenceQuery(targetFile, input.findings),
        maxChunks: 8,
        maxRelatedFiles: input.maxRelatedFiles,
        maxFilesToScan: input.maxRelatedFiles + 1,
      });

      for (const relatedFile of report.relatedFiles) {
        if (relatedFile.filePath === targetFile) {
          continue;
        }

        this.addRelatedCandidate(candidates, relatedFile, targetFile);
      }
    }

    return [...candidates.values()]
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.filePath.localeCompare(right.filePath);
      })
      .slice(0, input.maxRelatedFiles);
  }

  private addRelatedCandidate(
    candidates: Map<string, RelatedContextCandidate>,
    relatedFile: RelatedFile,
    selectedFromTarget: string,
  ): void {
    const current = candidates.get(relatedFile.filePath);

    if (!current) {
      candidates.set(relatedFile.filePath, {
        filePath: relatedFile.filePath,
        score: relatedFile.score,
        reasons: relatedFile.reasons,
        selectedFromTarget,
      });

      return;
    }

    current.score += relatedFile.score;
    current.reasons = [...new Set([...current.reasons, ...relatedFile.reasons])].sort();
  }

  private buildIntelligenceQuery(
    targetFile: string,
    findings: readonly RealProjectTrialErrorFinding[],
  ): string {
    const findingMessages = findings
      .filter((finding) => finding.relatedFile?.replaceAll('\\', '/').endsWith(targetFile) === true)
      .map((finding) => finding.message)
      .slice(0, 4);

    return [targetFile, ...findingMessages].join(' ').trim();
  }

  private normalizeTargetFiles(targetFiles: string[]): string[] {
    return [...new Set(targetFiles.map((file) => file.replaceAll('\\', '/')))].sort();
  }

  private resolveRelevantRange(
    targetFile: string,
    findings: readonly RealProjectTrialErrorFinding[],
  ): {
    relevantLineStart?: number | undefined;
    relevantLineEnd?: number | undefined;
  } {
    const lines = findings
      .filter((finding) => {
        return finding.relatedFile?.replaceAll('\\', '/').endsWith(targetFile) === true;
      })
      .map((finding) => finding.line)
      .filter((line): line is number => typeof line === 'number');

    if (lines.length === 0) {
      return {};
    }

    const minLine = Math.min(...lines);
    const maxLine = Math.max(...lines);

    return {
      relevantLineStart: Math.max(1, minLine - 20),
      relevantLineEnd: maxLine + 20,
    };
  }
}
