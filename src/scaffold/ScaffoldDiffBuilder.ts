import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  PatchOperation,
  PatchProposal,
  RepairDiffPreviewResult,
} from '../types/RepairTypes.js';

export interface ScaffoldDiffBuilderInput {
  projectRoot: string;
  proposal: PatchProposal;
}

export class ScaffoldDiffBuilder {
  public async build(input: ScaffoldDiffBuilderInput): Promise<RepairDiffPreviewResult[]> {
    const previews: RepairDiffPreviewResult[] = [];

    for (const operation of input.proposal.operations) {
      previews.push(
        await this.buildOperationPreview({
          projectRoot: input.projectRoot,
          operation,
        }),
      );
    }

    return previews;
  }

  private async buildOperationPreview(input: {
    projectRoot: string;
    operation: PatchOperation;
  }): Promise<RepairDiffPreviewResult> {
    const currentContent =
      input.operation.expectedCurrentContent ??
      (await this.readCurrentContent(input.projectRoot, input.operation.targetFile)) ??
      '';

    const proposedContent =
      input.operation.kind === 'delete_file' ? '' : (input.operation.newContent ?? '');

    const changed = currentContent !== proposedContent;
    const changedLines = this.countChangedLines(currentContent, proposedContent);

    return {
      targetFile: input.operation.targetFile,
      changed,
      changedLines,
      markdown: this.renderMarkdown({
        operation: input.operation,
        currentContent,
        proposedContent,
        changed,
        changedLines,
      }),
    };
  }

  private async readCurrentContent(
    projectRoot: string,
    targetFile: string,
  ): Promise<string | undefined> {
    try {
      return await readFile(join(projectRoot, targetFile), 'utf8');
    } catch {
      return undefined;
    }
  }

  private countChangedLines(currentContent: string, proposedContent: string): number {
    const currentLines = this.toLines(currentContent);
    const proposedLines = this.toLines(proposedContent);
    const maxLength = Math.max(currentLines.length, proposedLines.length);
    let changed = 0;

    for (let index = 0; index < maxLength; index += 1) {
      if ((currentLines[index] ?? '') !== (proposedLines[index] ?? '')) {
        changed += 1;
      }
    }

    return changed;
  }

  private toLines(value: string): string[] {
    if (value.length === 0) {
      return [];
    }

    return value.split('\n');
  }

  private renderMarkdown(input: {
    operation: PatchOperation;
    currentContent: string;
    proposedContent: string;
    changed: boolean;
    changedLines: number;
  }): string {
    const currentLines = this.toLines(input.currentContent);
    const proposedLines = this.toLines(input.proposedContent);
    const maxLength = Math.max(currentLines.length, proposedLines.length);
    const lines: string[] = [
      `### ${input.operation.targetFile}`,
      '',
      `Operation: ${input.operation.kind}`,
      `Changed: ${input.changed ? 'yes' : 'no'}`,
      `Changed lines: ${String(input.changedLines)}`,
      '',
      '```diff',
    ];

    for (let index = 0; index < maxLength; index += 1) {
      const current = currentLines[index];
      const proposed = proposedLines[index];

      if (current === proposed) {
        if (current !== undefined) {
          lines.push(` ${current}`);
        }

        continue;
      }

      if (current !== undefined) {
        lines.push(`-${current}`);
      }

      if (proposed !== undefined) {
        lines.push(`+${proposed}`);
      }
    }

    lines.push('```');

    return lines.join('\n');
  }
}
