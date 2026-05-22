export type RuntimeStatus = 'ok' | 'error';

export interface ApiEnvelope<TData> {
  status: RuntimeStatus;
  issues?: {
    code: string;
    message: string;
  }[];
  [key: string]: unknown;
}

export interface RuntimeHealth {
  status: RuntimeStatus;
  service?: string;
  localOnly?: boolean;
  realtime?: string;
}

export interface ProjectProfile {
  id: string;
  name: string;
  rootPath: string;
  stack: string[];
  packageManager: string;
  workingMode: string;
  gitRequired: boolean;
  hasPackageJson: boolean;
  hasTsConfig: boolean;
  hasSrcDirectory: boolean;
  hasPrismaSchema: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRegistry {
  version: 1;
  currentProjectId: string | null;
  projects: ProjectProfile[];
}

export interface InteractiveSessionState {
  id: string;
  projectRoot: string;
  projectName: string;
  status: string;
  goal: {
    original: string;
    current: string;
    updates: unknown[];
  };
  messages: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }[];
  runtimeActions: {
    id: string;
    title: string;
    description: string;
    status: string;
    createdAt: string;
  }[];
  timeline: {
    id: string;
    kind: string;
    message: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface RuntimeEvent {
  id: string;
  name: string;
  sessionId?: string;
  projectRoot?: string;
  message: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
export interface LocalDirectoryEntry {
  name: string;
  path: string;
  kind: 'directory' | 'file';
  hasPackageJson?: boolean;
  hasZeroConfig?: boolean;
}

export interface LocalDirectoryListResult {
  currentPath: string;
  parentPath: string | null;
  entries: LocalDirectoryEntry[];
}
export interface RuntimeSuggestion {
  id: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  recommendedCommand?: string;
  metadata?: Record<string, unknown>;
}

export interface SuggestionScanResult {
  projectRoot: string;
  suggestions: RuntimeSuggestion[];
  generatedAt: string;
}
export interface RuntimeQuestionOption {
  id: string;
  label: string;
  value: string;
  description?: string;
}

export interface RuntimeQuestion {
  id: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  question: string;
  reason: string;
  answerKind: 'single_choice' | 'free_text' | 'confirm';
  options: RuntimeQuestionOption[];
  createdAt: string;
}

export interface RuntimeQuestionsResult {
  questions: RuntimeQuestion[];
  generatedAt: string;
}

export interface QuestionAnswerState {
  version: 1;
  sessionId: string;
  answers: {
    questionId: string;
    answer: string;
    answeredAt: string;
  }[];
  updatedAt: string;
}
export interface QuestionDecisionBridgeResult {
  answers: QuestionAnswerState;
  decision?: {
    id: string;
    category: string;
    strength: string;
    statement: string;
    source: string;
    createdAt: string;
  };
  conflicts: {
    id: string;
    reason: string;
    severity: 'warning' | 'error';
  }[];
  appliedContext: {
    sessionId: string;
    blockedScopes: string[];
    allowedScopes: string[];
    codingRules: string[];
    workspaceMode?: string;
    requiresApproval: boolean;
    securityStrict: boolean;
    notes: string[];
  };
}
export interface SessionTask {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  kind: string;
  status: 'pending' | 'in_progress' | 'waiting_user' | 'blocked' | 'completed' | 'cancelled';
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  blockedReason?: string;
}

export interface SessionTaskQueueState {
  version: 1;
  sessionId: string;
  tasks: SessionTask[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskProgressReport {
  sessionId: string;
  total: number;
  pending: number;
  inProgress: number;
  waitingUser: number;
  blocked: number;
  completed: number;
  cancelled: number;
  completionRatio: number;
  nextTask?: SessionTask;
}

export interface SessionTasksResponse {
  tasks: SessionTaskQueueState;
  progress: TaskProgressReport;
}

export interface VerifyCommandDefinition {
  id: string;
  label: string;
  command: string;
  args: string[];
  description: string;
}

export interface VerifyRunResult {
  command: string;
  cwd: string;
  status: 'executed' | 'blocked' | 'failed';
  exitCode?: number;
  stdoutSummary: string;
  stderrSummary: string;
  issues: {
    code: string;
    message: string;
    severity: 'warning' | 'error';
  }[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface PackageScriptScanResult {
  projectRoot: string;
  packageJsonPath: string;
  scripts: Record<string, string>;
  safeVerifyScripts: string[];
}

export interface ReportExportResult {
  report: Record<string, unknown>;
  files: {
    sessionId: string;
    markdownPath: string;
    jsonPath: string;
  };
}

export interface ProjectStackIntelligence {
  projectRoot: string;
  stack: string[];
  generatedAt: string;
  [key: string]: unknown;
}

export interface ApiRouteMapResult {
  projectRoot: string;
  routes: {
    id: string;
    method: string;
    path: string;
    sourceFile: string;
    controller?: {
      name: string;
      importPath?: string;
      resolvedFile?: string;
    };
    middlewares: {
      name: string;
      importPath?: string;
      resolvedFile?: string;
    }[];
  }[];
  generatedAt: string;
}

export interface FrontendBackendLinkResult {
  projectRoot: string;
  usages: {
    id: string;
    sourceFile: string;
    endpoint: string;
    method: string;
    transport: 'fetch' | 'axios';
    lineNumber: number;
  }[];
  links: {
    id: string;
    usage: {
      endpoint: string;
      method: string;
      sourceFile: string;
      transport: 'fetch' | 'axios';
    };
    route?: {
      method: string;
      path: string;
      sourceFile: string;
    };
    matchType: 'exact' | 'method_mismatch' | 'missing_backend_route';
  }[];
  generatedAt: string;
}
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
  version: 1;
  provider: ProviderSettings;
  model: ModelSettings;
  workspace: WorkspaceSettings;
  github: GitHubSettings;
  protectedPaths: ProtectedPathSettings;
  approval: ApprovalBehaviorSettings;
  updatedAt: string;
}
export interface RuntimeWorkflowPrepareResult {
  sessionId: string;
  projectRoot: string;
  projectName: string;
  objective: string;
  workflowStatus: 'prepared';
  tasks: SessionTaskQueueState;
  taskProgress: TaskProgressReport;
  stack: ProjectStackIntelligence;
  apiRoutes: ApiRouteMapResult;
  frontendBackend: FrontendBackendLinkResult;
  questions: RuntimeQuestionsResult;
  suggestions: RuntimeSuggestion[];
  verifyScripts: PackageScriptScanResult | null;
  generatedAt: string;
}
export interface SnapshotManifest {
  snapshotId: string;
  sessionId: string;
  projectRoot: string;
  targetFiles: string[];
  snapshotRoot: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface CreateSnapshotResult {
  snapshot: SnapshotManifest;
  manifestPath: string;
}
export type RuntimeProviderName = 'openrouter' | 'local' | 'mock';

export interface RuntimeModelOption {
  id: string;
  label: string;
  provider: RuntimeProviderName;
  free: boolean;
  recommended: boolean;
  description: string;
}

export interface ProviderStatus {
  provider: RuntimeProviderName;
  configured: boolean;
  apiKeyPresent: boolean;
  apiKeySource: 'env' | 'missing';
  models: RuntimeModelOption[];
  defaultModel: string;
  generatedAt: string;
}

export interface ProviderStatusReport {
  providers: ProviderStatus[];
  activeProvider: RuntimeProviderName;
  activeModel: string;
  generatedAt: string;
}
export type RuntimePlanRiskLevel = 'low' | 'medium' | 'high';

export type RuntimePlanStatus = 'generated' | 'validated' | 'rejected';

export type RuntimePlanStepKind =
  | 'inspect'
  | 'context'
  | 'question'
  | 'snapshot'
  | 'plan'
  | 'patch'
  | 'approval'
  | 'verify'
  | 'report';

export interface RuntimePlanVerifyCommand {
  command: 'npm' | 'tsc';
  args: string[];
  reason: string;
  requiresApproval: true;
}

export interface RuntimePlanCandidateFile {
  path: string;
  reason: string;
  existsKnown: boolean;
}

export interface RuntimePlanRisk {
  code: string;
  level: RuntimePlanRiskLevel;
  message: string;
  mitigation: string;
}

export interface RuntimePlanStep {
  id: string;
  kind: RuntimePlanStepKind;
  title: string;
  description: string;
  requiresApproval: boolean;
}

export interface RuntimePlanScope {
  summary: string;
  includedAreas: string[];
  excludedAreas: string[];
  candidateFiles: RuntimePlanCandidateFile[];
}

export interface RuntimePlan {
  id: string;
  sessionId: string;
  projectRoot: string;
  projectName: string;
  objective: string;
  scope: RuntimePlanScope;
  steps: RuntimePlanStep[];
  risks: RuntimePlanRisk[];
  verifyCommands: RuntimePlanVerifyCommand[];
  needsSnapshot: boolean;
  requiresApproval: boolean;
  riskLevel: RuntimePlanRiskLevel;
  status: RuntimePlanStatus;
  createdAt: string;
}

export interface RuntimePlanValidationIssue {
  code: string;
  message: string;
  path?: string;
  severity: 'error' | 'warning';
}

export interface RuntimePlanValidationResult {
  valid: boolean;
  issues: RuntimePlanValidationIssue[];
}

export type RuntimePlanSource = 'runtime' | 'provider' | 'fallback';

export interface RuntimePlanProviderAudit {
  provider: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  generatedAt: string;
}

export interface RuntimePlanGenerateResult {
  source: RuntimePlanSource;
  plan: RuntimePlan;
  validation: RuntimePlanValidationResult;
  files: {
    planPath: string;
    activePlanPath: string;
  };
  providerAudit?: RuntimePlanProviderAudit;
  fallbackReason?: string;
}
export type RuntimePatchOperation = 'modify' | 'create' | 'delete';

export type RuntimePatchRiskLevel = 'low' | 'medium' | 'high';

export type RuntimePatchStatus = 'generated' | 'validated' | 'rejected';

export interface RuntimePatchFileChange {
  path: string;
  operation: RuntimePatchOperation;
  beforeHash: string | null;
  content: string | null;
  reason: string;
}

export interface RuntimePatchRisk {
  code: string;
  level: RuntimePatchRiskLevel;
  message: string;
  mitigation: string;
}

export interface RuntimePatchVerifyCommand {
  command: 'npm' | 'tsc';
  args: string[];
  reason: string;
  requiresApproval: true;
}

export interface RuntimePatchProposal {
  id: string;
  planId: string;
  sessionId: string;
  projectRoot: string;
  summary: string;
  files: RuntimePatchFileChange[];
  risks: RuntimePatchRisk[];
  verifyCommands: RuntimePatchVerifyCommand[];
  riskLevel: RuntimePatchRiskLevel;
  requiresApproval: true;
  status: RuntimePatchStatus;
  createdAt: string;
}

export interface RuntimePatchValidationIssue {
  code: string;
  message: string;
  path?: string;
  severity: 'error' | 'warning';
}

export interface RuntimePatchValidationResult {
  valid: boolean;
  issues: RuntimePatchValidationIssue[];
}

export interface RuntimePatchProposalGenerateResult {
  proposal: RuntimePatchProposal;
  validation: RuntimePatchValidationResult;
  files: {
    proposalPath: string;
    activeProposalPath: string;
  };
}
