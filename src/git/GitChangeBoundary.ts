import type { GitChangeBoundary as GitChangeBoundaryResult } from './GitAwarenessTypes.js';
import { GitStatusReader } from './GitStatusReader.js';

export interface GitChangeBoundaryOptions {
  statusReader?: GitStatusReader | undefined;
}

export class GitChangeBoundary {
  private readonly statusReader: GitStatusReader;

  public constructor(options: GitChangeBoundaryOptions = {}) {
    this.statusReader = options.statusReader ?? new GitStatusReader();
  }

  public async capture(projectRoot: string): Promise<GitChangeBoundaryResult> {
    const status = await this.statusReader.read(projectRoot);

    return {
      projectRoot: status.projectRoot,
      repositoryRoot: status.repositoryRoot,
      branch: status.branch,
      workingTreeState: status.workingTreeState,
      clean: status.clean,
      modifiedFiles: status.files
        .filter((file) => file.kind === 'modified')
        .map((file) => file.path),
      untrackedFiles: status.files
        .filter((file) => file.kind === 'untracked')
        .map((file) => file.path),
      deletedFiles: status.files.filter((file) => file.kind === 'deleted').map((file) => file.path),
      checkedAt: new Date().toISOString(),
      issues: status.issues,
    };
  }
}
