import type { GitGuardResult, GitStatusResult } from '../types/GitTypes.js';

export class DirtyTreeGuard {
  public requireDirty(status: GitStatusResult): GitGuardResult {
    if (!status.clean) {
      return {
        allowed: true,
        issues: [],
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      allowed: false,
      issues: [
        {
          code: 'GIT_TREE_CLEAN',
          message: 'No changes found. Checkpoint is not needed.',
          severity: 'warning',
        },
      ],
      checkedAt: new Date().toISOString(),
    };
  }

  public requireClean(status: GitStatusResult): GitGuardResult {
    if (status.clean) {
      return {
        allowed: true,
        issues: [],
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      allowed: false,
      issues: [
        {
          code: 'GIT_TREE_DIRTY',
          message: 'Working tree has changes.',
          severity: 'error',
        },
      ],
      checkedAt: new Date().toISOString(),
    };
  }
}
