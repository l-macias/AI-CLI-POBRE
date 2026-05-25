import type { PatchDiffPreview } from '../diff/PatchDiffTypes.js';
import type { PatchApplyResult } from '../patch-apply/PatchApplyTypes.js';
import { RuntimePatchApplyBridge } from '../patches/RuntimePatchApplyBridge.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';
import type { SandboxWorkspace } from './SandboxResult.js';

export interface SandboxPatchApplierOptions {
  applyBridge?: RuntimePatchApplyBridge | undefined;
}

export class SandboxPatchApplier {
  private readonly applyBridge: RuntimePatchApplyBridge;

  public constructor(options: SandboxPatchApplierOptions = {}) {
    this.applyBridge = options.applyBridge ?? new RuntimePatchApplyBridge();
  }

  public async apply(input: {
    proposal: RuntimePatchProposal;
    diff: PatchDiffPreview;
    workspace: SandboxWorkspace;
  }): Promise<PatchApplyResult> {
    const sandboxProposal: RuntimePatchProposal = {
      ...input.proposal,
      projectRoot: input.workspace.workspaceRoot,
    };

    const sandboxDiff: PatchDiffPreview = {
      ...input.diff,
      projectRoot: input.workspace.workspaceRoot,
    };

    return this.applyBridge.apply({
      proposal: sandboxProposal,
      diff: sandboxDiff,
      applyConfirmed: true,
      dryRun: false,
      snapshotId: `sandbox-${input.workspace.sandboxId}`,
      allowDirtyWorkingTree: true,
      allowMissingRepository: true,
      backupEnabled: false,
    });
  }
}
