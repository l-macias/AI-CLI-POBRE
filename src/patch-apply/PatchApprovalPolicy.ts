import type { PatchApplyInput, PatchApplyIssue } from './PatchApplyTypes.js';

export class PatchApprovalPolicy {
  public validateInput(input: PatchApplyInput): PatchApplyIssue[] {
    const issues: PatchApplyIssue[] = [];

    if (input.applyConfirmed !== true) {
      issues.push({
        code: 'PATCH_APPLY_NOT_CONFIRMED',
        message: 'Patch application requires applyConfirmed: true.',
        severity: 'error',
      });
    }

    for (const operation of input.proposal.operations) {
      if (operation.kind === 'delete_file' && input.confirmDelete !== true) {
        issues.push({
          code: 'PATCH_DELETE_NOT_CONFIRMED',
          message: `Delete operation requires confirmDelete: true: ${operation.targetFile}`,
          severity: 'error',
        });
      }
    }

    if (input.proposal.operations.length === 0) {
      issues.push({
        code: 'PATCH_APPLY_EMPTY_PROPOSAL',
        message: 'Patch proposal has no operations to apply.',
        severity: 'error',
      });
    }

    return issues;
  }
}
