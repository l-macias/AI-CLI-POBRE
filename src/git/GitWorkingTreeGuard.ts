import type { GitChangeBoundary, GitWorkingTreeGuardResult } from './GitAwarenessTypes.js';

export interface GitWorkingTreeGuardOptions {
  allowMissingRepository?: boolean | undefined;
  allowDirtyWorkingTree?: boolean | undefined;
}

export class GitWorkingTreeGuard {
  private readonly allowMissingRepository: boolean;
  private readonly allowDirtyWorkingTree: boolean;

  public constructor(options: GitWorkingTreeGuardOptions = {}) {
    this.allowMissingRepository = options.allowMissingRepository ?? false;
    this.allowDirtyWorkingTree = options.allowDirtyWorkingTree ?? false;
  }

  public evaluate(boundary: GitChangeBoundary): GitWorkingTreeGuardResult {
    if (boundary.issues.some((issue) => issue.severity === 'error')) {
      return {
        decision: 'blocked',
        allowed: false,
        reason: 'Git boundary has error issues.',
        issues: boundary.issues,
        checkedAt: new Date().toISOString(),
      };
    }

    if (boundary.issues.length > 0 && !this.allowMissingRepository) {
      return {
        decision: 'blocked',
        allowed: false,
        reason: 'Git repository is missing or unavailable.',
        issues: boundary.issues,
        checkedAt: new Date().toISOString(),
      };
    }

    if (!boundary.clean && !this.allowDirtyWorkingTree) {
      return {
        decision: 'blocked',
        allowed: false,
        reason: 'Working tree is dirty. User changes must be protected before writing.',
        issues: [
          {
            code: 'GIT_WORKING_TREE_DIRTY',
            message:
              'Working tree has existing changes. Writes should be blocked unless explicitly approved.',
            severity: 'error',
          },
        ],
        checkedAt: new Date().toISOString(),
      };
    }

    if (!boundary.clean) {
      return {
        decision: 'warning',
        allowed: true,
        reason: 'Working tree is dirty, but policy allows continuing.',
        issues: [
          {
            code: 'GIT_WORKING_TREE_DIRTY_ALLOWED',
            message: 'Working tree has existing changes and dirty state was explicitly allowed.',
            severity: 'warning',
          },
        ],
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      decision: 'allowed',
      allowed: true,
      reason: 'Working tree is clean.',
      issues: [],
      checkedAt: new Date().toISOString(),
    };
  }
}
