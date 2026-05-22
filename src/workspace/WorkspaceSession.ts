import type {
  WorkspaceModeResolutionResult,
  WorkspaceSession as WorkspaceSessionState,
} from './WorkspaceMode.js';

export class WorkspaceSessionFactory {
  public create(resolution: WorkspaceModeResolutionResult): WorkspaceSessionState {
    const createdAt = new Date().toISOString();

    return {
      id: `workspace-session-${createdAt.replaceAll(':', '').replaceAll('.', '')}`,
      projectRoot: resolution.projectRoot,
      mode: resolution.mode,
      status: resolution.status,
      gitRequired: resolution.gitRequired,
      gitAvailable: resolution.gitAvailable,
      ...(resolution.repositoryRoot ? { repositoryRoot: resolution.repositoryRoot } : {}),
      canRead: resolution.status === 'ready',
      canWrite: this.canWrite(resolution),
      requiresSnapshotBeforeWrite: resolution.mode === 'local_snapshot',
      requiresGitBeforeWrite: resolution.mode === 'git_diff' || resolution.mode === 'git_branch_pr',
      createdAt,
      issues: resolution.issues,
    };
  }

  private canWrite(resolution: WorkspaceModeResolutionResult): boolean {
    if (resolution.status !== 'ready') {
      return false;
    }

    if (resolution.mode === 'local_patchless') {
      return false;
    }

    return true;
  }
}
