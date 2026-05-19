import { RealProjectTrialFileReader } from '../real-project-trial/RealProjectTrialFileReader.js';
import type { RealProjectTrialErrorFinding } from '../types/RealProjectTrialTypes.js';
import type { RepairTargetFile } from '../types/RepairTypes.js';

export interface RepairContextBuilderInput {
  projectRoot: string;
  targetFiles: string[];
  findings: RealProjectTrialErrorFinding[];
  maxFileBytes?: number | undefined;
}

export class RepairContextBuilder {
  private readonly reader = new RealProjectTrialFileReader();

  public async build(input: RepairContextBuilderInput): Promise<RepairTargetFile[]> {
    const results: RepairTargetFile[] = [];

    for (const targetFile of input.targetFiles) {
      const file = await this.reader.read({
        projectRoot: input.projectRoot,
        relativePath: targetFile,
        maxBytes: input.maxFileBytes ?? 128_000,
      });

      results.push({
        relativePath: file.relativePath,
        exists: file.issues.length === 0,
        content: file.content,
        bytes: file.bytes,
        ...this.resolveRelevantRange(targetFile, input.findings),
      });
    }

    return results;
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
