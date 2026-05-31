export type RuntimeStatus = 'ok' | 'error';

export interface ApiEnvelope {
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
export type RuntimePlanMode = 'read_only' | 'patch';
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
  mode?: RuntimePlanMode;
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

export interface RuntimePlanProviderFailure {
  name: string;
  message: string;
  code?: string;
  cause?: Record<string, unknown>;
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
  providerFailure?: RuntimePlanProviderFailure;
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
  changesSummary: string[];
  riskLevel: RuntimePatchRiskLevel;
  userSelectable: true;
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
export type RuntimePatchDiffFileStatus = 'added' | 'modified' | 'deleted' | 'unchanged';

export interface RuntimePatchDiffLine {
  lineNumber: number;
  type: 'context' | 'added' | 'removed';
  content: string;
}

export interface RuntimePatchDiffFile {
  path: string;
  status: RuntimePatchDiffFileStatus;
  beforeHash: string | null;
  afterHash: string | null;
  additions: number;
  deletions: number;
  beforeContent: string | null;
  afterContent: string | null;
  lines: RuntimePatchDiffLine[];
}

export interface RuntimePatchDiffPreview {
  id: string;
  proposalId: string;
  planId: string;
  sessionId: string;
  projectRoot: string;
  files: RuntimePatchDiffFile[];
  summary: {
    filesChanged: number;
    additions: number;
    deletions: number;
  };
  safeToPreview: boolean;
  createdAt: string;
}

export interface RuntimePatchDiffGenerateResult {
  diff: RuntimePatchDiffPreview;
  files: {
    diffPath: string;
    activeDiffPath: string;
  };
}
export type RuntimePatchApplyStatus = 'applied' | 'blocked' | 'failed' | 'dry_run';

export interface RuntimePatchApplyIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface RuntimePatchApplyOperationResult {
  targetFile: string;
  kind: 'replace_file' | 'edit_file' | 'create_file' | 'delete_file';
  status: 'applied' | 'skipped' | 'failed';
  backup?: {
    targetFile: string;
    backupPath: string;
    existed: boolean;
    createdAt: string;
  };
  message: string;
}

export interface RuntimePatchApplyResult {
  id: string;
  status: RuntimePatchApplyStatus;
  projectRoot: string;
  proposalId: string;
  operationResults: RuntimePatchApplyOperationResult[];
  issues: RuntimePatchApplyIssue[];
  createdAt: string;
  completedAt: string;
  [key: string]: unknown;
}

export type RuntimePatchSandboxStatus = 'passed' | 'failed' | 'blocked';

export interface RuntimePatchSandboxIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface RuntimePatchSandboxWorkspace {
  sandboxId: string;
  sessionId: string;
  sourceProjectRoot: string;
  sandboxRoot: string;
  workspaceRoot: string;
  createdAt: string;
}

export interface RuntimePatchSandboxResult {
  id: string;
  status: RuntimePatchSandboxStatus;
  proposalId: string;
  sessionId: string;
  projectRoot: string;
  workspace: RuntimePatchSandboxWorkspace | null;
  applyResult: RuntimePatchApplyResult | null;
  verifyRuns: VerifyRunResult[];
  issues: RuntimePatchSandboxIssue[];
  startedAt: string;
  completedAt: string;
}

export interface RuntimePatchSandboxResponse {
  sandbox: RuntimePatchSandboxResult;
  files: {
    resultPath: string;
    activeResultPath: string;
  };
}
export type RuntimePatchRecoveryStatus =
  | 'repair_prompt_ready'
  | 'max_attempts_reached'
  | 'not_recoverable';

export interface RuntimePatchFailureVerifyFailure {
  command: string;
  status: 'executed' | 'blocked' | 'failed';
  exitCode?: number;
  stdoutSummary: string;
  stderrSummary: string;
  issues: {
    code: string;
    message: string;
    severity: 'warning' | 'error';
  }[];
}

export interface RuntimePatchFailureReport {
  id: string;
  status: 'failed' | 'blocked';
  proposalId: string;
  planId: string;
  sessionId: string;
  projectRoot: string;
  summary: string;
  failedFiles: string[];
  sandboxResultId: string;
  sandboxStatus: RuntimePatchSandboxStatus;
  sandboxIssues: RuntimePatchSandboxIssue[];
  applyStatus: RuntimePatchApplyStatus | 'not_applied';
  verifyFailures: RuntimePatchFailureVerifyFailure[];
  originalPatchSummary: {
    fileCount: number;
    riskLevel: RuntimePatchRiskLevel;
    files: {
      path: string;
      operation: RuntimePatchOperation;
      riskLevel: RuntimePatchRiskLevel;
      reason: string;
      changesSummary: string[];
    }[];
  };
  createdAt: string;
}

export interface RuntimePatchRepairPrompt {
  system: string;
  user: string;
  constraints: string[];
  metadata: {
    proposalId: string;
    failureReportId: string;
    sessionId: string;
    currentAttempt: number;
    maxAttempts: number;
  };
}

export interface RuntimePatchRecoveryAttempt {
  attemptNumber: number;
  proposalId: string;
  sandboxResultId: string;
  failureReport: RuntimePatchFailureReport;
  repairPrompt: RuntimePatchRepairPrompt;
  createdAt: string;
}

export interface RuntimePatchRecoveryResult {
  id: string;
  status: RuntimePatchRecoveryStatus;
  proposalId: string;
  sessionId: string;
  currentAttempt: number;
  maxAttempts: number;
  attempts: RuntimePatchRecoveryAttempt[];
  issues: {
    code: string;
    message: string;
    severity: 'warning' | 'error';
  }[];
  createdAt: string;
}

export interface RuntimePatchRecoveryResponse {
  recovery: RuntimePatchRecoveryResult;
  files: {
    recoveryPath: string;
    activeRecoveryPath: string;
  };
}
export interface RuntimePatchRecoveryProposalResponse {
  source: 'provider';
  proposal: RuntimePatchProposal;
  validation: RuntimePatchValidationResult;
  files: {
    proposalPath: string;
    activeProposalPath: string;
  };
  providerAudit: {
    provider: string;
    model: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    generatedAt: string;
  };
}
export interface RuntimePatchApplyResponse {
  apply: RuntimePatchApplyResult;
}
export type RuntimePatchRollbackStatus = 'rolled_back' | 'blocked' | 'dry_run' | 'failed';

export interface RuntimePatchRollbackIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface RuntimePatchRollbackOperationResult {
  targetFile: string;
  status: 'restored' | 'deleted_created_file' | 'skipped' | 'failed';
  message: string;
  backupPath?: string;
}

export interface RuntimePatchRollbackResult {
  id: string;
  status: RuntimePatchRollbackStatus;
  projectRoot: string;
  applyId: string;
  proposalId: string;
  operationResults: RuntimePatchRollbackOperationResult[];
  issues: RuntimePatchRollbackIssue[];
  createdAt: string;
  completedAt: string;
}

export interface RuntimePatchRollbackResponse {
  rollback: RuntimePatchRollbackResult;
}
export type RuntimeWorkflowStepId =
  | 'session'
  | 'prepare_workflow'
  | 'runtime_questions'
  | 'runtime_plan'
  | 'patch_proposal'
  | 'diff_preview'
  | 'snapshot'
  | 'sandbox'
  | 'recovery_prepare'
  | 'repaired_patch'
  | 'dry_run'
  | 'apply'
  | 'rollback'
  | 'verify'
  | 'report';

export type RuntimeWorkflowStepStatus = 'locked' | 'available' | 'active' | 'completed' | 'blocked';

export interface RuntimeWorkflowArtifactState {
  sessionStarted: boolean;
  workflowPrepared: boolean;
  pendingQuestionCount: number;
  pendingHighPriorityQuestionCount: number;
  planValid: boolean;
  planRejected: boolean;
  planMode: RuntimePlanMode | null;
  patchProposalValid: boolean;
  patchProposalRejected: boolean;
  diffReady: boolean;
  diffBlocked: boolean;

  sandboxPassed: boolean;
  sandboxFailed: boolean;
  sandboxBlocked: boolean;

  recoveryAvailable: boolean;
  recoveryPrepared: boolean;
  recoveryMaxAttemptsReached: boolean;
  repairedProposalGenerated: boolean;

  snapshotAvailable: boolean;
  dryRunCompleted: boolean;
  applyApplied: boolean;
  applyBlocked: boolean;
  applyFailed: boolean;
  rollbackDryRunCompleted: boolean;
  rollbackCompleted: boolean;
  rollbackBlocked: boolean;
  rollbackFailed: boolean;
  verifyCompleted: boolean;
  reportExported: boolean;
  riskLevel: 'low' | 'medium' | 'high' | null;
}

export interface RuntimeWorkflowStep {
  id: RuntimeWorkflowStepId;
  title: string;
  description: string;
  status: RuntimeWorkflowStepStatus;
  required: boolean;
  blockedReason?: string;
}

export interface RuntimeWorkflowState {
  steps: RuntimeWorkflowStep[];
  currentStepId: RuntimeWorkflowStepId;
  completed: number;
  total: number;
  percentage: number;
  snapshotRequired: boolean;
  canContinue: boolean;
  blockedReasons: string[];
}

export type RuntimeWorkflowActionId =
  | 'start_session'
  | 'prepare_workflow'
  | 'answer_runtime_questions'
  | 'generate_runtime_plan'
  | 'generate_patch_proposal'
  | 'generate_diff_preview'
  | 'create_snapshot'
  | 'verify_sandbox'
  | 'prepare_recovery'
  | 'generate_repaired_patch'
  | 'dry_run_apply'
  | 'apply_patch'
  | 'rollback_patch'
  | 'run_verify'
  | 'export_report'
  | 'none';

export interface RuntimeActionAvailability {
  actionId: RuntimeWorkflowActionId;
  title: string;
  description: string;
  enabled: boolean;
  blockedReason?: string;
  relatedStepId?: RuntimeWorkflowStepId;
}

export interface RuntimeWorkflowStateResponse {
  workflow: RuntimeWorkflowState;
  nextAction: RuntimeActionAvailability;
}
export type ApprovalRiskLevel = 'low' | 'medium' | 'high';

export type ApprovalRequestKind =
  | 'plan'
  | 'patch'
  | 'verify'
  | 'risk'
  | 'dirty_working_tree'
  | 'rollback';

export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';

export type ApprovalActionKind = 'approve' | 'reject' | 'ask_revision' | 'approve_selected_files';

export interface ApprovalChecklistItem {
  id: string;
  label: string;
  description: string;
  status: 'passed' | 'warning' | 'blocked';
}

export interface ApprovalAction {
  kind: ApprovalActionKind;
  label: string;
  enabled: boolean;
  blockedReason?: string;
}

export interface ApprovalFileReview {
  path: string;
  operation: RuntimePatchOperation;
  reason: string;
  changesSummary: string[];
  riskLevel: ApprovalRiskLevel;
  userSelectable: true;
  selectedByDefault: boolean;
}

export interface ApprovalRequest {
  id: string;
  sessionId: string;
  kind: ApprovalRequestKind;
  title: string;
  description: string;
  riskLevel: ApprovalRiskLevel;
  status: ApprovalRequestStatus;
  target: {
    type: ApprovalRequestKind;
    id: string;
  };
  checklist: ApprovalChecklistItem[];
  actions: ApprovalAction[];
  filePaths: string[];
  fileReviews: ApprovalFileReview[];
  createdAt: string;
}

export interface ApprovalCenterArtifactState {
  sessionId: string;
  projectRoot: string;
  plan?: RuntimePlan | null;
  planMode?: RuntimePlanMode | null;
  proposal?: RuntimePatchProposal | null;
  diff?: RuntimePatchDiffPreview | null;
  applyResult?: RuntimePatchApplyResult | null;
  lastVerifyRun?: VerifyRunResult | null;
  snapshotAvailable: boolean;
  dirtyWorkingTree: boolean;
}

export interface ApprovalCenterResult {
  sessionId: string;
  projectRoot: string;
  pendingCount: number;
  highestRisk: ApprovalRiskLevel;
  requests: ApprovalRequest[];
  generatedAt: string;
}

export interface ApprovalDecisionInput {
  requestId: string;
  action: ApprovalActionKind;
  selectedFilePaths?: string[];
  reason?: string;
}

export interface ApprovalDecisionResult {
  requestId: string;
  action: ApprovalActionKind;
  accepted: boolean;
  blockedReason?: string;
  selectedFilePaths: string[];
  reason?: string;
  decidedAt: string;
}

export interface ApprovalCenterResponse {
  approvalCenter: ApprovalCenterResult;
}

export interface ApprovalDecisionResponse {
  decision: ApprovalDecisionResult;
  approvalCenter: ApprovalCenterResult;
}
export type SessionDecisionCategory =
  | 'scope'
  | 'coding_style'
  | 'workspace'
  | 'permission'
  | 'architecture'
  | 'security'
  | 'workflow';

export type SessionDecisionStrength = 'preference' | 'constraint' | 'hard_rule';

export interface SessionDecision {
  id: string;
  sessionId: string;
  category: SessionDecisionCategory;
  strength: SessionDecisionStrength;
  statement: string;
  normalizedStatement: string;
  source: 'user' | 'runtime' | 'system';
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface SessionDecisionState {
  version: 1;
  sessionId: string;
  decisions: SessionDecision[];
  updatedAt: string;
}

export interface AppliedDecisionContext {
  sessionId: string;
  blockedScopes: string[];
  allowedScopes: string[];
  codingRules: string[];
  workspaceMode?: string;
  requiresApproval: boolean;
  securityStrict: boolean;
  notes: string[];
}

export interface DecisionConflict {
  id: string;
  decisionA: SessionDecision;
  decisionB: SessionDecision;
  reason: string;
  severity: 'warning' | 'error';
}

export type ProjectMemoryEntryKind =
  | 'fact'
  | 'decision'
  | 'constraint'
  | 'session_note'
  | 'known_file';

export type ProjectMemoryImportance = 'critical' | 'high' | 'medium' | 'low';

export type ProjectMemoryTrustLevel =
  | 'user-approved'
  | 'runtime-generated'
  | 'provider-suggested'
  | 'quarantined';

export interface ProjectMemoryEntry {
  id: string;
  kind: ProjectMemoryEntryKind;
  title: string;
  content: string;
  importance: ProjectMemoryImportance;
  trustLevel: ProjectMemoryTrustLevel;
  tags: string[];
  source?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectKnownFileMemory {
  path: string;
  summary: string;
  importance: ProjectMemoryImportance;
  trustLevel: ProjectMemoryTrustLevel;
  tags: string[];
  lastSeenAt: string;
  metadata?: Record<string, unknown>;
}

export interface ProjectMemoryDocument {
  version: 1;
  projectName: string;
  projectRoot: string;
  entries: ProjectMemoryEntry[];
  knownFiles: ProjectKnownFileMemory[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionMemoryView {
  sessionId: string;
  projectRoot: string;
  sessionDecisions: SessionDecisionState;
  appliedContext: AppliedDecisionContext;
  conflicts: DecisionConflict[];
  projectMemory: ProjectMemoryDocument;
}

export interface SessionMemoryResponse {
  memory: SessionMemoryView;
}

export interface SessionDecisionCreateRequest {
  sessionId: string;
  category: SessionDecisionCategory;
  strength: SessionDecisionStrength;
  statement: string;
}

export interface SessionDecisionCreateResponse {
  sessionDecisions: SessionDecisionState;
  conflicts: DecisionConflict[];
  appliedContext: AppliedDecisionContext;
}

export interface ProjectMemoryEntryCreateRequest {
  projectRoot: string;
  projectName?: string;
  kind: ProjectMemoryEntryKind;
  title: string;
  content: string;
  importance?: ProjectMemoryImportance;
  trustLevel?: ProjectMemoryTrustLevel;
  tags?: string[];
  source?: string;
}

export interface ProjectMemoryEntryCreateResponse {
  projectMemory: ProjectMemoryDocument;
}
export type ContextGraphRelatedFileReason =
  | 'direct_import'
  | 'importer'
  | 'retrieval_match'
  | 'shared_symbol'
  | 'shared_type_reference'
  | 'same_directory'
  | 'nearby_index_file';

export interface ContextGraphImport {
  sourceFilePath: string;
  importedPath: string;
  resolvedPath?: string;
  isTypeOnly: boolean;
  specifiers: string[];
  importKind: 'static_import' | 'side_effect_import' | 're_export' | 'dynamic_import';
}

export interface ContextGraphRelatedFile {
  filePath: string;
  score: number;
  reasons: ContextGraphRelatedFileReason[];
}

export interface ContextGraphRelationship {
  filePath: string;
  imports: ContextGraphImport[];
  importedBy: string[];
  relatedFiles: ContextGraphRelatedFile[];
}

export interface ContextGraphSymbol {
  name: string;
  kind: string;
  filePath: string;
  line: number;
  sourceText: string;
}

export interface ContextGraphSymbolScanResult {
  filePath: string;
  exports: ContextGraphSymbol[];
  imports: ContextGraphSymbol[];
}

export interface ContextGraphTypeReference {
  name: string;
  filePath: string;
  line: number;
  sourceText: string;
}

export interface ContextGraphTypeReferenceScanResult {
  filePath: string;
  references: ContextGraphTypeReference[];
}

export interface ContextGraphChunk {
  chunk: {
    filePath: string;
    startLine: number;
    endLine: number;
    content: string;
  };
  score: number;
  matchedTerms: string[];
}

export interface ContextGraphRetrievalResult {
  query: string;
  chunks: ContextGraphChunk[];
  filesScanned: number;
  chunksScanned: number;
  createdAt: string;
}

export interface ContextGraphTargetExpansion {
  targetFilePath: string;
  scannedFilePaths: string[];
  selectedRelatedFilePaths: string[];
  maxRelatedFiles: number;
  maxFilesToScan: number;
  reasons: string[];
}

export interface ContextGraphReport {
  input: {
    query?: string;
    targetFilePath?: string;
    maxChunks?: number;
    maxRelatedFiles?: number;
    maxFilesToScan?: number;
  };
  targetFilePath?: string;
  relationship?: ContextGraphRelationship;
  relatedFiles: ContextGraphRelatedFile[];
  symbols: ContextGraphSymbolScanResult[];
  typeReferences: ContextGraphTypeReferenceScanResult[];
  retrieval: ContextGraphRetrievalResult;
  targetExpansion?: ContextGraphTargetExpansion;
  createdAt: string;
}

export interface ContextGraphResponse {
  contextGraph: ContextGraphReport;
}
export type RuntimeArtifactKind =
  | 'runtime_plan'
  | 'patch_proposal'
  | 'patch_diff'
  | 'apply_report'
  | 'session_state'
  | 'task_state'
  | 'verify_runs'
  | 'session_decisions'
  | 'report_markdown'
  | 'report_json'
  | 'active_plan'
  | 'active_patch_proposal'
  | 'active_patch_diff'
  | 'sandbox_result'
  | 'patch_recovery'
  | 'unknown';

export interface RuntimeArtifactSummary {
  id: string;
  kind: RuntimeArtifactKind;
  label: string;
  path: string;
  sessionId?: string;
  projectRoot?: string;
  createdAt?: string;
  updatedAt?: string;
  sizeBytes: number;
  metadata: Record<string, unknown>;
}

export interface RuntimeArtifactIndex {
  version: 1;
  rootDir: string;
  artifacts: RuntimeArtifactSummary[];
  generatedAt: string;
}

export interface RuntimeArtifactIndexResponse {
  artifactIndex: RuntimeArtifactIndex;
}

export interface RuntimeArtifactReadResponse {
  artifact: RuntimeArtifactSummary;
  content: string;
}
export interface InteractiveSessionListResponse {
  sessions: InteractiveSessionState[];
}
export interface RuntimeDataInventoryCount {
  total: number;
  active: number;
  archived: number;
  suspectedTest: number;
}

export interface RuntimeDataInventoryDirectory {
  name: string;
  path: string;
  exists: boolean;
  fileCount: number;
  directoryCount: number;
  sizeBytes: number;
}

export interface RuntimeDataInventorySession {
  sessionId: string;
  status: 'active' | 'archived';
  suspectedTest: boolean;
  artifactCount: number;
  sizeBytes: number;
  updatedAt?: string;
}

export interface RuntimeDataInventoryReport {
  version: 1;
  runtimeRoot: string;
  generatedAt: string;
  totals: {
    files: number;
    directories: number;
    sizeBytes: number;
    sessions: RuntimeDataInventoryCount;
    artifacts: RuntimeDataInventoryCount;
  };
  directories: RuntimeDataInventoryDirectory[];
  sessions: RuntimeDataInventorySession[];
  recommendations: string[];
}

export interface RuntimeDataInventoryResponse {
  inventory: RuntimeDataInventoryReport;
}
export interface RuntimeArchiveMovedPath {
  from: string;
  to: string;
  kind: 'file' | 'directory';
}

export interface RuntimeArchiveSessionResult {
  sessionId: string;
  archived: boolean;
  dryRun: boolean;
  moved: RuntimeArchiveMovedPath[];
  skipped: string[];
}

export interface RuntimeArchiveSessionsResult {
  version: 1;
  archivedAt: string;
  dryRun: boolean;
  results: RuntimeArchiveSessionResult[];
}

export interface RuntimeArchiveSessionsResponse {
  archive: RuntimeArchiveSessionsResult;
  inventory: RuntimeDataInventoryReport;
}
export interface RuntimeRestoreSessionResult {
  sessionId: string;
  restored: boolean;
  dryRun: boolean;
  moved: RuntimeArchiveMovedPath[];
  skipped: string[];
}

export interface RuntimeRestoreSessionsResult {
  version: 1;
  restoredAt: string;
  dryRun: boolean;
  results: RuntimeRestoreSessionResult[];
}

export interface RuntimeRestoreSessionsResponse {
  restore: RuntimeRestoreSessionsResult;
  inventory: RuntimeDataInventoryReport;
}
