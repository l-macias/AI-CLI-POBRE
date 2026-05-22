export type WorkspaceMode = 'local_snapshot' | 'local_patchless' | 'git_diff' | 'git_branch_pr';

export interface ProviderSettings {
  provider: 'openrouter' | 'local' | 'mock';
  apiKeyConfigured: boolean;
  allowPaidModels: boolean;
}

export interface ModelSettings {
  defaultModel: string;
  fallbackModel: string;
  maxContextTokens: number;
}

export interface WorkspaceSettings {
  defaultMode: WorkspaceMode;
  requireSnapshotBeforeApply: boolean;
  gitRequired: boolean;
}

export interface GitHubSettings {
  useGitHubCli: boolean;
  ghInstalled: boolean;
  ghAuthenticated: boolean;
  allowPullRequests: boolean;
}

export interface ProtectedPathSettings {
  paths: string[];
}

export interface ApprovalBehaviorSettings {
  requireApprovalForPlan: boolean;
  requireApprovalForPatch: boolean;
  requireApprovalForVerify: boolean;
  blockHighRiskApply: boolean;
}

export interface RuntimeSettingsViewModel {
  provider: ProviderSettings;
  model: ModelSettings;
  workspace: WorkspaceSettings;
  github: GitHubSettings;
  protectedPaths: ProtectedPathSettings;
  approval: ApprovalBehaviorSettings;
}
