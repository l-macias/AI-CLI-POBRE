import type {
  ApiRouteMapResult,
  FrontendBackendLinkResult,
  InteractiveSessionState,
  LocalDirectoryEntry,
  LocalDirectoryListResult,
  PackageScriptScanResult,
  ProjectRegistry,
  ProjectStackIntelligence,
  ReportExportResult,
  RuntimeEvent,
  RuntimeHealth,
  RuntimeQuestionsResult,
  SessionTasksResponse,
  SuggestionScanResult,
  VerifyCommandDefinition,
  VerifyRunResult,
  RuntimeSettingsViewModel,
  RuntimeWorkflowPrepareResult,
  CreateSnapshotResult,
  QuestionDecisionBridgeResult,
  ProviderStatusReport,
  RuntimePlanGenerateResult,
  RuntimePatchProposalGenerateResult,
  RuntimePatchDiffGenerateResult,
  RuntimePatchApplyResponse,
  RuntimePatchRollbackResponse,
  RuntimeWorkflowArtifactState,
  RuntimeWorkflowStateResponse,
  ApprovalCenterArtifactState,
  ApprovalCenterResponse,
  ApprovalDecisionInput,
  ApprovalDecisionResponse,
  ProjectMemoryEntryCreateRequest,
  ProjectMemoryEntryCreateResponse,
  ProjectProfile,
  SessionDecisionCreateRequest,
  SessionDecisionCreateResponse,
  SessionMemoryResponse,
  ContextGraphResponse,
  RuntimeArtifactIndexResponse,
  RuntimeArtifactReadResponse,
  InteractiveSessionListResponse,
} from '../types/runtime';

async function readJson<T>(response: Response): Promise<T> {
  const parsed = (await response.json()) as unknown;

  return parsed as T;
}

export async function getHealth(): Promise<RuntimeHealth> {
  const response = await fetch('/api/health');

  return readJson<RuntimeHealth>(response);
}

export async function listProjects(): Promise<ProjectRegistry> {
  const response = await fetch('/api/projects');
  const parsed = await readJson<{ registry: ProjectRegistry }>(response);

  return parsed.registry;
}
export async function getCurrentProject(): Promise<ProjectProfile | null> {
  const response = await fetch('/api/projects/current');
  const parsed = await readJson<{ project: ProjectProfile | null }>(response);

  return parsed.project;
}

export async function scanProject(input: {
  rootPath: string;
  name: string;
  workingMode: 'local_patchless' | 'local_snapshot' | 'git_diff' | 'git_branch_pr';
}): Promise<ProjectRegistry> {
  const response = await fetch('/api/projects/scan', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const parsed = await readJson<{ registry: ProjectRegistry }>(response);

  return parsed.registry;
}

export async function startSession(input: {
  projectRoot: string;
  projectName: string;
  goal: string;
}): Promise<InteractiveSessionState> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const parsed = await readJson<{ session: InteractiveSessionState }>(response);

  return parsed.session;
}
export async function listSessions(): Promise<InteractiveSessionListResponse> {
  const response = await fetch('/api/sessions');

  return readJson<InteractiveSessionListResponse>(response);
}
export async function sendSessionCommand(input: {
  sessionId: string;
  command: string;
}): Promise<InteractiveSessionState> {
  const response = await fetch(`/api/sessions/${encodeURIComponent(input.sessionId)}/commands`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      input: input.command,
    }),
  });

  const parsed = await readJson<{
    result: {
      session: InteractiveSessionState;
    };
  }>(response);

  return parsed.result.session;
}
export async function listFilesystemRoots(): Promise<LocalDirectoryEntry[]> {
  const response = await fetch('/api/filesystem/roots');
  const parsed = await readJson<{ roots: LocalDirectoryEntry[] }>(response);

  return parsed.roots;
}

export async function listFilesystemChildren(path: string): Promise<LocalDirectoryListResult> {
  const response = await fetch(`/api/filesystem/children?path=${encodeURIComponent(path)}`);
  const parsed = await readJson<{ directory: LocalDirectoryListResult }>(response);

  return parsed.directory;
}

export function subscribeRuntimeEvents(input: {
  onEvent: (event: RuntimeEvent) => void;
}): EventSource {
  const source = new EventSource('/api/events');

  const eventNames = [
    'session.started',
    'session.command',
    'project.scanned',
    'snapshot.created',
    'snapshot.after_captured',
    'snapshot.restored',
    'workspace.resolved',
  ];

  for (const eventName of eventNames) {
    source.addEventListener(eventName, (event) => {
      const parsed = JSON.parse(event.data) as RuntimeEvent;
      input.onEvent(parsed);
    });
  }

  return source;
}
export async function getSuggestions(input: {
  projectRoot: string;
  projectName?: string;
  stack?: string[];
  workspaceMode?: string;
  gitAvailable?: boolean;
  snapshotAvailable?: boolean;
  errors?: string[];
  runtimeActions?: {
    title: string;
    description: string;
    status: string;
  }[];
}): Promise<SuggestionScanResult> {
  const response = await fetch('/api/suggestions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const parsed = await readJson<{ suggestions: SuggestionScanResult }>(response);

  return parsed.suggestions;
}
export async function getRuntimeQuestions(input: {
  sessionId: string;
  stack?: string[];
  workspaceMode?: string;
  knownDecisions?: string[];
}): Promise<RuntimeQuestionsResult> {
  const response = await fetch('/api/questions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const parsed = await readJson<{ questions: RuntimeQuestionsResult }>(response);

  return parsed.questions;
}

export async function answerRuntimeQuestion(input: {
  sessionId: string;
  questionId: string;
  answer: string;
  stack?: string[];
  workspaceMode?: string;
}): Promise<QuestionDecisionBridgeResult> {
  const response = await fetch('/api/questions/answer', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sessionId: input.sessionId,
      questionId: input.questionId,
      answer: input.answer,
      ...(input.stack ? { stack: input.stack } : {}),
      ...(input.workspaceMode ? { workspaceMode: input.workspaceMode } : {}),
    }),
  });

  return readJson<QuestionDecisionBridgeResult>(response);
}

export async function getSessionTasks(sessionId: string): Promise<SessionTasksResponse> {
  const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/tasks`);
  const parsed = await readJson<SessionTasksResponse>(response);

  return parsed;
}

export async function createSessionTask(input: {
  sessionId: string;
  title: string;
  description: string;
  kind: string;
  dependencies?: string[];
}): Promise<SessionTasksResponse> {
  const response = await fetch(`/api/sessions/${encodeURIComponent(input.sessionId)}/tasks`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      kind: input.kind,
      ...(input.dependencies ? { dependencies: input.dependencies } : {}),
    }),
  });

  const parsed = await readJson<SessionTasksResponse>(response);

  return parsed;
}

export async function transitionSessionTask(input: {
  sessionId: string;
  taskId: string;
  status: string;
  reason?: string;
}): Promise<SessionTasksResponse> {
  const response = await fetch(
    `/api/sessions/${encodeURIComponent(input.sessionId)}/tasks/${encodeURIComponent(input.taskId)}/transition`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        status: input.status,
        ...(input.reason ? { reason: input.reason } : {}),
      }),
    },
  );

  const parsed = await readJson<SessionTasksResponse>(response);

  return parsed;
}

export async function listVerifyCommands(): Promise<VerifyCommandDefinition[]> {
  const response = await fetch('/api/verify/commands');
  const parsed = await readJson<{ commands: VerifyCommandDefinition[] }>(response);

  return parsed.commands;
}

export async function scanPackageScripts(projectRoot: string): Promise<PackageScriptScanResult> {
  const response = await fetch('/api/verify/scripts', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ projectRoot }),
  });

  const parsed = await readJson<{ scripts: PackageScriptScanResult }>(response);

  return parsed.scripts;
}

export async function runVerifyCommand(input: {
  sessionId?: string;
  command: string;
  args: string[];
  cwd: string;
  approved: boolean;
}): Promise<VerifyRunResult> {
  const response = await fetch('/api/verify/run', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      command: input.command,
      args: input.args,
      cwd: input.cwd,
      approved: input.approved,
    }),
  });

  const parsed = await readJson<{ verify: VerifyRunResult }>(response);

  return parsed.verify;
}

export async function exportSessionReport(sessionId: string): Promise<ReportExportResult> {
  const response = await fetch('/api/reports/export', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ sessionId }),
  });

  return readJson<ReportExportResult>(response);
}

export async function detectProjectStack(projectRoot: string): Promise<ProjectStackIntelligence> {
  const response = await fetch('/api/intelligence/stack', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ projectRoot }),
  });

  const parsed = await readJson<{ intelligence: ProjectStackIntelligence }>(response);

  return parsed.intelligence;
}

export async function mapApiRoutes(projectRoot: string): Promise<ApiRouteMapResult> {
  const response = await fetch('/api/intelligence/api-routes', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ projectRoot }),
  });

  const parsed = await readJson<{ routeMap: ApiRouteMapResult }>(response);

  return parsed.routeMap;
}

export async function linkFrontendBackend(projectRoot: string): Promise<FrontendBackendLinkResult> {
  const response = await fetch('/api/intelligence/frontend-backend', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ projectRoot }),
  });

  const parsed = await readJson<{ links: FrontendBackendLinkResult }>(response);

  return parsed.links;
}
export async function getRuntimeSettings(): Promise<RuntimeSettingsViewModel> {
  const response = await fetch('/api/settings');
  const parsed = await readJson<{ settings: RuntimeSettingsViewModel }>(response);

  return parsed.settings;
}

export async function saveRuntimeSettings(
  settings: RuntimeSettingsViewModel,
): Promise<RuntimeSettingsViewModel> {
  const response = await fetch('/api/settings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  const parsed = await readJson<{ settings: RuntimeSettingsViewModel }>(response);

  return parsed.settings;
}
export async function prepareRuntimeWorkflow(input: {
  sessionId: string;
  workspaceMode?: string;
  createDefaultTasks?: boolean;
}): Promise<RuntimeWorkflowPrepareResult> {
  const response = await fetch('/api/workflow/prepare', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sessionId: input.sessionId,
      ...(input.workspaceMode ? { workspaceMode: input.workspaceMode } : {}),
      ...(input.createDefaultTasks !== undefined
        ? { createDefaultTasks: input.createDefaultTasks }
        : {}),
    }),
  });

  const parsed = await readJson<{ workflow: RuntimeWorkflowPrepareResult }>(response);

  return parsed.workflow;
}
export async function createSnapshot(input: {
  projectRoot: string;
  sessionId: string;
  targetFiles: string[];
}): Promise<CreateSnapshotResult> {
  const response = await fetch('/api/snapshots', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return readJson<CreateSnapshotResult>(response);
}
export async function getProviderStatus(): Promise<ProviderStatusReport> {
  const response = await fetch('/api/providers/status');
  const parsed = await readJson<{ providers: ProviderStatusReport }>(response);

  return parsed.providers;
}
export async function generateRuntimePlan(input: {
  sessionId: string;
  instruction: string;
  workspaceMode?: string;
  stack?: string[];
  knownFiles?: string[];
  useProvider?: boolean;
  model?: string;
}): Promise<RuntimePlanGenerateResult> {
  const response = await fetch('/api/plans/generate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sessionId: input.sessionId,
      instruction: input.instruction,
      ...(input.workspaceMode ? { workspaceMode: input.workspaceMode } : {}),
      ...(input.stack ? { stack: input.stack } : {}),
      ...(input.knownFiles ? { knownFiles: input.knownFiles } : {}),
      ...(input.useProvider !== undefined ? { useProvider: input.useProvider } : {}),
      ...(input.model ? { model: input.model } : {}),
    }),
  });

  return readJson<RuntimePlanGenerateResult>(response);
}
export async function generatePatchProposal(input: {
  sessionId: string;
  planId: string;
  summary: string;
  riskLevel?: 'low' | 'medium' | 'high';
  useProvider?: boolean;
  model?: string;
  candidateFiles: {
    path: string;
    existsKnown: boolean;
    reason: string;
  }[];
  verifyCommands?: {
    command: 'npm' | 'tsc';
    args: string[];
    reason: string;
    requiresApproval: true;
  }[];
}): Promise<RuntimePatchProposalGenerateResult> {
  const response = await fetch('/api/patches/propose', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sessionId: input.sessionId,
      planId: input.planId,
      summary: input.summary,
      ...(input.riskLevel ? { riskLevel: input.riskLevel } : {}),
      ...(input.useProvider !== undefined ? { useProvider: input.useProvider } : {}),
      ...(input.model ? { model: input.model } : {}),
      candidateFiles: input.candidateFiles,
      ...(input.verifyCommands ? { verifyCommands: input.verifyCommands } : {}),
    }),
  });

  return readJson<RuntimePatchProposalGenerateResult>(response);
}
export async function generatePatchDiff(input: {
  proposal: RuntimePatchProposalGenerateResult['proposal'];
}): Promise<RuntimePatchDiffGenerateResult> {
  const response = await fetch('/api/patches/diff', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      proposal: input.proposal,
    }),
  });

  return readJson<RuntimePatchDiffGenerateResult>(response);
}
export async function applyRuntimePatch(input: {
  proposal: RuntimePatchProposalGenerateResult['proposal'];
  diff: RuntimePatchDiffGenerateResult['diff'];
  applyConfirmed: boolean;
  dryRun?: boolean;
  snapshotId?: string;
  allowDirtyWorkingTree?: boolean;
  allowMissingRepository?: boolean;
  backupEnabled?: boolean;
}): Promise<RuntimePatchApplyResponse> {
  const response = await fetch('/api/patches/apply', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      proposal: input.proposal,
      diff: input.diff,
      applyConfirmed: input.applyConfirmed,
      ...(input.dryRun !== undefined ? { dryRun: input.dryRun } : {}),
      ...(input.snapshotId ? { snapshotId: input.snapshotId } : {}),
      ...(input.allowDirtyWorkingTree !== undefined
        ? { allowDirtyWorkingTree: input.allowDirtyWorkingTree }
        : {}),
      ...(input.allowMissingRepository !== undefined
        ? { allowMissingRepository: input.allowMissingRepository }
        : {}),
      ...(input.backupEnabled !== undefined ? { backupEnabled: input.backupEnabled } : {}),
    }),
  });

  return readJson<RuntimePatchApplyResponse>(response);
}
export async function rollbackRuntimePatch(input: {
  applyResult: RuntimePatchApplyResponse['apply'];
  rollbackConfirmed: boolean;
  dryRun?: boolean;
}): Promise<RuntimePatchRollbackResponse> {
  const response = await fetch('/api/patches/rollback', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      applyResult: input.applyResult,
      rollbackConfirmed: input.rollbackConfirmed,
      ...(input.dryRun !== undefined ? { dryRun: input.dryRun } : {}),
    }),
  });

  return readJson<RuntimePatchRollbackResponse>(response);
}
export async function buildRuntimeWorkflowState(input: {
  artifactState: RuntimeWorkflowArtifactState;
}): Promise<RuntimeWorkflowStateResponse> {
  const response = await fetch('/api/workflow/state', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      artifactState: input.artifactState,
    }),
  });

  return readJson<RuntimeWorkflowStateResponse>(response);
}
export async function buildApprovalCenter(input: {
  artifactState: ApprovalCenterArtifactState;
}): Promise<ApprovalCenterResponse> {
  const response = await fetch('/api/approvals/center', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      artifactState: input.artifactState,
    }),
  });

  return readJson<ApprovalCenterResponse>(response);
}

export async function resolveApproval(input: {
  artifactState: ApprovalCenterArtifactState;
  decision: ApprovalDecisionInput;
}): Promise<ApprovalDecisionResponse> {
  const response = await fetch('/api/approvals/resolve', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      artifactState: input.artifactState,
      decision: input.decision,
    }),
  });

  return readJson<ApprovalDecisionResponse>(response);
}
export async function getSessionMemory(input: {
  sessionId: string;
  projectRoot: string;
  projectName?: string;
}): Promise<SessionMemoryResponse> {
  const response = await fetch('/api/memory/session', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return readJson<SessionMemoryResponse>(response);
}

export async function addSessionMemoryDecision(
  input: SessionDecisionCreateRequest,
): Promise<SessionDecisionCreateResponse> {
  const response = await fetch('/api/memory/session/decisions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return readJson<SessionDecisionCreateResponse>(response);
}

export async function addProjectMemoryEntry(
  input: ProjectMemoryEntryCreateRequest,
): Promise<ProjectMemoryEntryCreateResponse> {
  const response = await fetch('/api/memory/project/entries', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return readJson<ProjectMemoryEntryCreateResponse>(response);
}
export async function generateContextGraph(input: {
  projectRoot: string;
  query?: string;
  targetFilePath?: string;
  maxChunks?: number;
  maxRelatedFiles?: number;
  maxFilesToScan?: number;
}): Promise<ContextGraphResponse> {
  const response = await fetch('/api/intelligence/context-graph', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      projectRoot: input.projectRoot,
      ...(input.query ? { query: input.query } : {}),
      ...(input.targetFilePath ? { targetFilePath: input.targetFilePath } : {}),
      ...(input.maxChunks ? { maxChunks: input.maxChunks } : {}),
      ...(input.maxRelatedFiles ? { maxRelatedFiles: input.maxRelatedFiles } : {}),
      ...(input.maxFilesToScan ? { maxFilesToScan: input.maxFilesToScan } : {}),
    }),
  });

  return readJson<ContextGraphResponse>(response);
}
export async function listRuntimeArtifacts(): Promise<RuntimeArtifactIndexResponse> {
  const response = await fetch('/api/artifacts');

  return readJson<RuntimeArtifactIndexResponse>(response);
}

export async function readRuntimeArtifact(path: string): Promise<RuntimeArtifactReadResponse> {
  const response = await fetch(`/api/artifacts/read?path=${encodeURIComponent(path)}`);

  return readJson<RuntimeArtifactReadResponse>(response);
}
