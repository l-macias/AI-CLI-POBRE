import type {
  ApiRouteMapResult,
  FrontendBackendLinkResult,
  InteractiveSessionState,
  LocalDirectoryEntry,
  LocalDirectoryListResult,
  PackageScriptScanResult,
  ProjectRegistry,
  ProjectStackIntelligence,
  QuestionAnswerState,
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
