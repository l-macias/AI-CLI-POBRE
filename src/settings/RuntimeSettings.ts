export type RuntimeSettingsProvider = 'openrouter' | 'local' | 'mock';

export type RuntimeSettingsWorkspaceMode =
  | 'local_snapshot'
  | 'local_patchless'
  | 'git_diff'
  | 'git_branch_pr';

export interface RuntimeProviderSettings {
  provider: RuntimeSettingsProvider;
  apiKeyConfigured: boolean;
  allowPaidModels: boolean;
}

export interface RuntimeModelSettings {
  defaultModel: string;
  fallbackModel: string;
  maxContextTokens: number;
}

export interface RuntimeWorkspaceSettings {
  defaultMode: RuntimeSettingsWorkspaceMode;
  requireSnapshotBeforeApply: boolean;
  gitRequired: boolean;
}

export interface RuntimeGitHubSettings {
  useGitHubCli: boolean;
  ghInstalled: boolean;
  ghAuthenticated: boolean;
  allowPullRequests: boolean;
}

export interface RuntimeProtectedPathSettings {
  paths: string[];
}

export interface RuntimeApprovalBehaviorSettings {
  requireApprovalForPlan: boolean;
  requireApprovalForPatch: boolean;
  requireApprovalForVerify: boolean;
  blockHighRiskApply: boolean;
}

export interface RuntimeSettings {
  version: 1;
  provider: RuntimeProviderSettings;
  model: RuntimeModelSettings;
  workspace: RuntimeWorkspaceSettings;
  github: RuntimeGitHubSettings;
  protectedPaths: RuntimeProtectedPathSettings;
  approval: RuntimeApprovalBehaviorSettings;
  updatedAt: string;
}

export function createDefaultRuntimeSettings(): RuntimeSettings {
  return {
    version: 1,
    provider: {
      provider: 'openrouter',
      apiKeyConfigured: Boolean(process.env['OPENROUTER_API_KEY']),
      allowPaidModels: false,
    },
    model: {
      defaultModel: 'poolside/laguna-xs.2:free',
      fallbackModel: 'mock/fake-provider',
      maxContextTokens: 120_000,
    },
    workspace: {
      defaultMode: 'local_snapshot',
      requireSnapshotBeforeApply: true,
      gitRequired: false,
    },
    github: {
      useGitHubCli: true,
      ghInstalled: false,
      ghAuthenticated: false,
      allowPullRequests: false,
    },
    protectedPaths: {
      paths: ['.env', '.env.local', '.git', 'node_modules', 'dist', 'build'],
    },
    approval: {
      requireApprovalForPlan: true,
      requireApprovalForPatch: true,
      requireApprovalForVerify: true,
      blockHighRiskApply: true,
    },
    updatedAt: new Date().toISOString(),
  };
}
