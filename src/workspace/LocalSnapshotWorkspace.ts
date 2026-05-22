import type { WorkspaceModeResolutionResult, WorkspaceSession } from './WorkspaceMode.js';
import { WorkspaceSessionFactory } from './WorkspaceSession.js';

export interface LocalSnapshotWorkspaceOptions {
  sessionFactory?: WorkspaceSessionFactory | undefined;
}

export class LocalSnapshotWorkspace {
  private readonly sessionFactory: WorkspaceSessionFactory;

  public constructor(options: LocalSnapshotWorkspaceOptions = {}) {
    this.sessionFactory = options.sessionFactory ?? new WorkspaceSessionFactory();
  }

  public createSession(resolution: WorkspaceModeResolutionResult): WorkspaceSession {
    return this.sessionFactory.create({
      ...resolution,
      mode: 'local_snapshot',
      gitRequired: false,
      status: 'ready',
      issues: [
        ...resolution.issues,
        {
          code: 'WORKSPACE_LOCAL_SNAPSHOT_REQUIRED',
          message:
            'Local snapshot mode allows writes only after snapshot protection is prepared by the runtime.',
          severity: 'info',
        },
      ],
    });
  }
}
