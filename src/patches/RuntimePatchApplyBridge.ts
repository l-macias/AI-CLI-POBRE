import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PatchApplyRunner } from '../patch-apply/PatchApplyRunner.js';
import type { PatchApplyResult } from '../patch-apply/PatchApplyTypes.js';
import type { PatchDiffPreview } from '../diff/PatchDiffTypes.js';
import type { PatchOperation, PatchProposal } from '../types/RepairTypes.js';
import type { RuntimePatchProposal } from './PatchProposal.js';
import { PatchApplySafetyGuard } from './PatchApplySafetyGuard.js';

export interface RuntimePatchApplyBridgeOptions {
  runner?: PatchApplyRunner | undefined;
  safetyGuard?: PatchApplySafetyGuard | undefined;
}

export interface RuntimePatchApplyBridgeInput {
  proposal: RuntimePatchProposal;
  diff: PatchDiffPreview;
  applyConfirmed: boolean;
  snapshotId?: string | undefined;
  dryRun?: boolean | undefined;
  allowDirtyWorkingTree?: boolean | undefined;
  allowMissingRepository?: boolean | undefined;
  backupEnabled?: boolean | undefined;
}

export class RuntimePatchApplyBridge {
  private readonly runner: PatchApplyRunner;
  private readonly safetyGuard: PatchApplySafetyGuard;

  public constructor(options: RuntimePatchApplyBridgeOptions = {}) {
    this.runner = options.runner ?? new PatchApplyRunner();
    this.safetyGuard = options.safetyGuard ?? new PatchApplySafetyGuard();
  }

  public async apply(input: RuntimePatchApplyBridgeInput): Promise<PatchApplyResult> {
    this.validateRuntimeGates(input);

    const proposal = await this.toRepairPatchProposal(input.proposal);

    return this.runner.run({
      projectRoot: input.proposal.projectRoot,
      proposal,
      applyConfirmed: input.applyConfirmed,
      dryRun: input.dryRun,
      allowDirtyWorkingTree: input.allowDirtyWorkingTree,
      allowMissingRepository: input.allowMissingRepository,
      backupEnabled: input.backupEnabled ?? true,
    });
  }

  private validateRuntimeGates(input: RuntimePatchApplyBridgeInput): void {
    const guard = this.safetyGuard.validate({
      proposal: input.proposal,
      diff: input.diff,
    });

    if (!guard.allowed) {
      throw new Error(
        `Runtime patch apply safety guard blocked apply: ${guard.issues
          .map((issue) => `${issue.code}: ${issue.message}`)
          .join(' | ')}`,
      );
    }

    if (input.dryRun !== true && input.applyConfirmed !== true) {
      throw new Error('Runtime patch apply requires explicit apply confirmation.');
    }

    if (
      input.dryRun !== true &&
      (input.proposal.riskLevel === 'medium' || input.proposal.riskLevel === 'high') &&
      (!input.snapshotId || input.snapshotId.trim().length === 0)
    ) {
      throw new Error('Medium/high risk runtime patch apply requires a snapshot id.');
    }
  }

  private async toRepairPatchProposal(proposal: RuntimePatchProposal): Promise<PatchProposal> {
    const operations: PatchOperation[] = [];

    for (const file of proposal.files) {
      if (file.operation === 'delete') {
        operations.push({
          kind: 'delete_file',
          targetFile: file.path,
          reason: file.reason,
        });

        continue;
      }

      if (file.content === null) {
        throw new Error(`Runtime patch file content is missing: ${file.path}`);
      }

      if (file.operation === 'create') {
        operations.push({
          kind: 'create_file',
          targetFile: file.path,
          newContent: file.content,
          reason: file.reason,
        });

        continue;
      }

      const currentContent = await this.readAndVerifyCurrentContent({
        projectRoot: proposal.projectRoot,
        targetFile: file.path,
        expectedHash: file.beforeHash,
      });

      operations.push({
        kind: 'replace_file',
        targetFile: file.path,
        expectedCurrentContent: currentContent,
        newContent: file.content,
        reason: file.reason,
      });
    }

    return {
      id: proposal.id,
      summary: proposal.summary,
      riskLevel: proposal.riskLevel,
      operations,
      explanation: [
        'Generated from a validated RuntimePatchProposal.',
        'Apply was delegated through RuntimePatchApplyBridge after diff preview and runtime gates.',
        'PatchApplySafetyGuard validated proposal, risk policy and diff/proposal consistency before apply.',
      ].join('\n'),
    };
  }

  private async readAndVerifyCurrentContent(input: {
    projectRoot: string;
    targetFile: string;
    expectedHash: string | null;
  }): Promise<string> {
    if (!input.expectedHash) {
      throw new Error(`Runtime patch modify operation requires beforeHash: ${input.targetFile}`);
    }

    const absolutePath = path.join(input.projectRoot, input.targetFile);
    const currentContent = await readFile(absolutePath, 'utf8');
    const currentHash = this.hashContent(currentContent);

    if (currentHash !== input.expectedHash) {
      throw new Error(
        `Runtime patch beforeHash mismatch for ${input.targetFile}. Expected ${input.expectedHash}, got ${currentHash}.`,
      );
    }

    return currentContent;
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
