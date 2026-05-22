import type { WorkspaceModeResolutionResult, WorkspaceSession } from './WorkspaceMode.js';
import { WorkspaceSessionFactory } from './WorkspaceSession.js';

export interface GitWorkspaceOptions {
  sessionFactory?: WorkspaceSessionFactory | undefined;
}

export class GitWorkspace {
  private readonly sessionFactory: WorkspaceSessionFactory;

  public constructor(options: GitWorkspaceOptions = {}) {
    this.sessionFactory = options.sessionFactory ?? new WorkspaceSessionFactory();
  }

  public createSession(resolution: WorkspaceModeResolutionResult): WorkspaceSession {
    return this.sessionFactory.create({
      ...resolution,
      gitRequired: true,
    });
  }
}
