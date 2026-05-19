import type { GitStatusResult, PreChangeSnapshotResult } from '../types/GitTypes.js';

export class PreChangeSnapshot {
  public evaluate(status: GitStatusResult): PreChangeSnapshotResult {
    if (!status.clean) {
      return {
        shouldCheckpoint: true,
        reason: 'Working tree has changes. Create a checkpoint before large or risky changes.',
        status,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      shouldCheckpoint: false,
      reason: 'Working tree is clean. Git checkpoint is optional.',
      status,
      checkedAt: new Date().toISOString(),
    };
  }
}
