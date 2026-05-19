import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PatchOperation, PatchProposal } from '../types/RepairTypes.js';
import type { ScaffoldProposal, ScaffoldRequest } from './ScaffoldTypes.js';

export interface ScaffoldPatchBridgeInput {
  request: ScaffoldRequest;
  proposal: ScaffoldProposal;
}

export class ScaffoldPatchBridge {
  public async toPatchProposal(input: ScaffoldPatchBridgeInput): Promise<PatchProposal> {
    const operations: PatchOperation[] = [];

    for (const file of input.proposal.files) {
      operations.push({
        kind: file.kind,
        targetFile: file.targetFile,
        newContent: file.content,
        expectedCurrentContent:
          file.kind === 'replace_file'
            ? await this.readExpectedCurrentContent(input.request.projectRoot, file.targetFile)
            : undefined,
        reason: file.reason,
      });
    }

    return {
      id: `patch-from-${input.proposal.id}`,
      summary: input.proposal.summary,
      riskLevel: input.proposal.riskLevel,
      operations,
      explanation: [
        input.proposal.explanation,
        '',
        'Generated from a validated scaffold proposal.',
        'This patch proposal must still pass runtime validation, diff preview, user approval, and PatchApplyRunner gates before writing.',
      ].join('\n'),
    };
  }

  private async readExpectedCurrentContent(
    projectRoot: string,
    targetFile: string,
  ): Promise<string | undefined> {
    try {
      return await readFile(join(projectRoot, targetFile), 'utf8');
    } catch {
      return undefined;
    }
  }
}
