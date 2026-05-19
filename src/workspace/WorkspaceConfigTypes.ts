export interface WorkspaceTargetProject {
  id: string;
  name: string;
  rootPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceConfig {
  version: 1;
  currentProjectId: string | null;
  projects: WorkspaceTargetProject[];
}

export interface WorkspaceConfigIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface WorkspaceConfigValidationResult {
  valid: boolean;
  issues: WorkspaceConfigIssue[];
}

export interface TargetProjectAddInput {
  name: string;
  rootPath: string;
  setCurrent?: boolean | undefined;
}

export interface TargetProjectRemoveInput {
  projectRef: string;
}

export interface TargetProjectUseInput {
  projectRef: string;
}

export interface TargetProjectResolveInput {
  explicitProjectRoot?: string | undefined;
  workspaceRoot?: string | undefined;
}

export interface TargetProjectResolveResult {
  projectRoot: string;
  source: 'explicit' | 'workspace_current';
  project?: WorkspaceTargetProject | undefined;
}
