import type { WorkspaceModeResolutionResult, WorkspaceSession } from './WorkspaceMode.js';
import { WorkspaceSessionFactory } from './WorkspaceSession.js';

export interface LocalPatchlessWorkspaceOptions {
  sessionFactory?: WorkspaceSessionFactory | undefined;
}

export class LocalPatchlessWorkspace {
  private readonly sessionFactory: WorkspaceSessionFactory;

  public constructor(options: LocalPatchlessWorkspaceOptions = {}) {
    this.sessionFactory = options.sessionFactory ?? new WorkspaceSessionFactory();
  }

  public createSession(resolution: WorkspaceModeResolutionResult): WorkspaceSession {
    return this.sessionFactory.create({
      ...resolution,
      mode: 'local_patchless',
      gitRequired: false,
      status: 'ready',
      issues: [
        ...resolution.issues,
        {
          code: 'WORKSPACE_LOCAL_PATCHLESS_READ_ONLY',
          message:
            'Local patchless mode is read-only. Runtime may inspect and plan but cannot write.',
          severity: 'info',
        },
      ],
    });
  }
}
