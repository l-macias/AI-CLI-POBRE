import type { PatchApplyInput, PatchApplyPlan } from './PatchApplyTypes.js';

export class PatchApplyPlanner {
  public plan(input: PatchApplyInput): PatchApplyPlan {
    const createdAt = new Date().toISOString();

    return {
      id: `patch-apply-plan-${createdAt.replaceAll(':', '').replaceAll('.', '')}`,
      projectRoot: input.projectRoot,
      proposal: input.proposal,
      operations: input.proposal.operations,
      backupEnabled: input.backupEnabled ?? true,
      createdAt,
      issues: [],
    };
  }
}
