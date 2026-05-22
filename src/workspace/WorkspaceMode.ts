import type { ProjectWorkingMode } from '../projects/ProjectProfile.js';

export type WorkspaceMode = ProjectWorkingMode;

export type WorkspaceSessionStatus = 'ready' | 'blocked';

export interface WorkspaceModeIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface WorkspaceModeResolutionInput {
  projectRoot: string;
  requestedMode?: WorkspaceMode | undefined;
  gitRequired?: boolean | undefined;
}

export interface WorkspaceModeResolutionResult {
  projectRoot: string;
  mode: WorkspaceMode;
  gitRequired: boolean;
  gitAvailable: boolean;
  repositoryRoot?: string | undefined;
  status: WorkspaceSessionStatus;
  issues: WorkspaceModeIssue[];
  resolvedAt: string;
}

export interface WorkspaceSession {
  id: string;
  projectRoot: string;
  mode: WorkspaceMode;
  status: WorkspaceSessionStatus;
  gitRequired: boolean;
  gitAvailable: boolean;
  repositoryRoot?: string | undefined;
  canRead: boolean;
  canWrite: boolean;
  requiresSnapshotBeforeWrite: boolean;
  requiresGitBeforeWrite: boolean;
  createdAt: string;
  issues: WorkspaceModeIssue[];
}
