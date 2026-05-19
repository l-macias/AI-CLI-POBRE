import type { GitGuardResult } from '../types/GitTypes.js';

export interface GitBranchGuardOptions {
  blockedBranches?: readonly string[] | undefined;
}

export class GitBranchGuard {
  private readonly blockedBranches: readonly string[];

  public constructor(options: GitBranchGuardOptions = {}) {
    this.blockedBranches = options.blockedBranches ?? ['main', 'master'];
  }

  public check(branch: string): GitGuardResult {
    const blocked = this.blockedBranches.includes(branch);

    return {
      allowed: !blocked,
      issues: blocked
        ? [
            {
              code: 'GIT_BRANCH_BLOCKED',
              message: `Branch "${branch}" is protected for automatic checkpoints.`,
              severity: 'error',
            },
          ]
        : [],
      checkedAt: new Date().toISOString(),
    };
  }
}
