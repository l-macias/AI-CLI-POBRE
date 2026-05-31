import { useEffect, useMemo, useState } from 'react';
import {
  answerRuntimeQuestion,
  createSessionTask,
  detectProjectStack,
  exportSessionReport,
  getRuntimeQuestions,
  getSessionTasks,
  getSuggestions,
  linkFrontendBackend,
  listVerifyCommands,
  mapApiRoutes,
  runVerifyCommand,
  scanPackageScripts,
  sendSessionCommand,
  startSession,
  transitionSessionTask,
  prepareRuntimeWorkflow,
  createSnapshot,
  generateRuntimePlan,
  getRuntimeSettings,
  generatePatchProposal,
  generatePatchDiff,
  verifyPatchSandbox,
  preparePatchRecovery,
  generatePatchRecoveryProposal,
  applyRuntimePatch,
  rollbackRuntimePatch,
  buildRuntimeWorkflowState,
  buildApprovalCenter,
  resolveApproval,
  addSessionMemoryDecision,
  getSessionMemory,
  generateContextGraph,
  listRuntimeArtifacts,
  readRuntimeArtifact,
  listSessions,
} from '../api/runtimeApi';

// Imports de componentes (Asumimos que estos ya tienen o tendrán Tailwind)
import { AuditTimeline } from '../components/audit/AuditTimeline';
import { ProjectIntelligencePanel } from '../components/intelligence/ProjectIntelligencePanel';
import { RuntimeQuestionsPanel } from '../components/questions/RuntimeQuestionsPanel';
import { ReportExportPanel } from '../components/reports/ReportExportPanel';
import { ApprovalPanel } from '../components/session/ApprovalPanel';
import { ChatPanel } from '../components/session/ChatPanel';
import { ContextPanel } from '../components/session/ContextPanel';
import { PatchPanel } from '../components/session/PatchPanel';
import { PlanPanel } from '../components/session/PlanPanel';
import { RuntimeStatusBar } from '../components/session/RuntimeStatusBar';
import {
  SessionWorkspaceTabs,
  type SessionWorkspaceTab,
} from '../components/session/SessionWorkspaceTabs';
import { SessionTimelinePanel } from '../components/session/SessionTimelinePanel';
import { SuggestionPanel } from '../components/suggestions/SuggestionPanel';
import { TaskQueuePanel } from '../components/tasks/TaskQueuePanel';
import { VerifyPanel } from '../components/verify/VerifyPanel';
import { SnapshotPanel } from '../components/snapshots/SnapshotPanel';
import { IntelligentContextPanel } from '../components/context/IntelligentContextPanel';
import { GuidedWorkflowPanel } from '../components/workflow/GuidedWorkflowPanel';
import { SessionMemoryPanel } from '../components/memory/SessionMemoryPanel';
import type { SessionMemoryDecisionDraft } from '../components/memory/MemoryTypes';
import { ContextGraphPanel } from '../components/context/ContextGraphPanel';
import { RuntimeArtifactStorePanel } from '../components/artifacts/RuntimeArtifactStorePanel';
import { SessionResumePanel } from '../components/sessions/SessionResumePanel';
import { Badge } from '../components/Badge';
import type {
  ApiRouteMapResult,
  FrontendBackendLinkResult,
  InteractiveSessionState,
  PackageScriptScanResult,
  ProjectStackIntelligence,
  ReportExportResult,
  RuntimeEvent,
  RuntimeQuestion,
  RuntimeSuggestion,
  SessionTask,
  TaskProgressReport,
  VerifyCommandDefinition,
  VerifyRunResult,
  CreateSnapshotResult,
  RuntimePlanGenerateResult,
  RuntimeSettingsViewModel,
  RuntimePatchProposalGenerateResult,
  RuntimePatchDiffGenerateResult,
  RuntimePatchApplyResult,
  RuntimePatchRollbackResult,
  RuntimeWorkflowArtifactState,
  RuntimeWorkflowStateResponse,
  RuntimeWorkflowPrepareResult,
  ApprovalCenterArtifactState,
  ApprovalCenterResult,
  ApprovalDecisionInput,
  SessionMemoryView,
  ProjectProfile,
  ContextGraphReport,
  RuntimeArtifactIndex,
  RuntimeArtifactSummary,
  ApprovalDecisionResult,
  RuntimePatchSandboxResult,
  RuntimePatchRecoveryResult,
} from '../types/runtime';
import { ClipboardList, FolderKanban, Route, ShieldCheck, Sparkles } from 'lucide-react';

const sessionGoalTemplates = [
  {
    label: 'Safe small improvement',
    goal: 'Analyze the project and propose one small, safe improvement. Do not touch database, .env, Prisma, migrations or protected files.',
  },
  {
    label: 'Find and fix TypeScript issue',
    goal: 'Analyze the project, find a small TypeScript or UI issue, propose a controlled plan, generate a patch, run sandbox verification and export a report.',
  },
  {
    label: 'UI polish only',
    goal: 'Improve a small UI/UX detail only. Do not touch backend, database, authentication, .env, Prisma or migrations.',
  },
  {
    label: 'Read-only analysis',
    goal: 'Analyze the project and produce recommendations only. Do not generate or apply patches in this session.',
  },
];

interface SessionPageProps {
  selectedProject: ProjectProfile | null;
  initialSession: InteractiveSessionState | null;
  runtimeEvents?: RuntimeEvent[];
  onSessionChange: (session: InteractiveSessionState | null) => void;
}

export function SessionPage({
  selectedProject,
  initialSession,
  runtimeEvents = [],
  onSessionChange,
}: SessionPageProps) {
  const [projectRoot, setProjectRoot] = useState('');
  const [projectName, setProjectName] = useState('');
  const [goal, setGoal] = useState('');
  const [command, setCommand] = useState('/plan');
  const [session, setSession] = useState<InteractiveSessionState | null>(initialSession);
  const [sessionStartLoading, setSessionStartLoading] = useState(false);
  const [savedSessions, setSavedSessions] = useState<InteractiveSessionState[]>([]);
  const [savedSessionsLoading, setSavedSessionsLoading] = useState(false);

  const [suggestions, setSuggestions] = useState<RuntimeSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const [questions, setQuestions] = useState<RuntimeQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const [tasks, setTasks] = useState<SessionTask[]>([]);
  const [taskProgress, setTaskProgress] = useState<TaskProgressReport | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);

  const [verifyCommands, setVerifyCommands] = useState<VerifyCommandDefinition[]>([]);
  const [packageScripts, setPackageScripts] = useState<PackageScriptScanResult | null>(null);
  const [lastVerifyRun, setLastVerifyRun] = useState<VerifyRunResult | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [stackIntelligence, setStackIntelligence] = useState<ProjectStackIntelligence | null>(null);
  const [apiRoutes, setApiRoutes] = useState<ApiRouteMapResult | null>(null);
  const [frontendBackendLinks, setFrontendBackendLinks] =
    useState<FrontendBackendLinkResult | null>(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [contextGraph, setContextGraph] = useState<ContextGraphReport | null>(null);
  const [contextGraphLoading, setContextGraphLoading] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(false);

  const [artifactIndex, setArtifactIndex] = useState<RuntimeArtifactIndex | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<RuntimeArtifactSummary | null>(null);
  const [selectedArtifactContent, setSelectedArtifactContent] = useState('');
  const [artifactLoading, setArtifactLoading] = useState(false);

  const [runtimePlan, setRuntimePlan] = useState<RuntimePlanGenerateResult | null>(null);
  const [runtimePlanLoading, setRuntimePlanLoading] = useState(false);

  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsViewModel | null>(null);

  const [patchProposal, setPatchProposal] = useState<RuntimePatchProposalGenerateResult | null>(
    null,
  );
  const [patchProposalLoading, setPatchProposalLoading] = useState(false);
  const [patchDiff, setPatchDiff] = useState<RuntimePatchDiffGenerateResult | null>(null);
  const [patchDiffLoading, setPatchDiffLoading] = useState(false);
  const [patchSandboxResult, setPatchSandboxResult] = useState<RuntimePatchSandboxResult | null>(
    null,
  );
  const [patchSandboxLoading, setPatchSandboxLoading] = useState(false);
  const [patchRecoveryResult, setPatchRecoveryResult] = useState<RuntimePatchRecoveryResult | null>(
    null,
  );
  const [patchRecoveryLoading, setPatchRecoveryLoading] = useState(false);
  const [patchRecoveryProposalLoading, setPatchRecoveryProposalLoading] = useState(false);
  const [patchApplyResult, setPatchApplyResult] = useState<RuntimePatchApplyResult | null>(null);
  const [patchApplyLoading, setPatchApplyLoading] = useState(false);
  const [patchRollbackResult, setPatchRollbackResult] = useState<RuntimePatchRollbackResult | null>(
    null,
  );
  const [patchRollbackLoading, setPatchRollbackLoading] = useState(false);

  const [reportExport, setReportExport] = useState<ReportExportResult | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [runtimeWorkflow, setRuntimeWorkflow] = useState<RuntimeWorkflowStateResponse | null>(null);
  const [runtimeWorkflowLoading, setRuntimeWorkflowLoading] = useState(false);

  const [approvalCenter, setApprovalCenter] = useState<ApprovalCenterResult | null>(null);
  const [approvalCenterLoading, setApprovalCenterLoading] = useState(false);
  const [approvedPatchFilePaths, setApprovedPatchFilePaths] = useState<string[] | null>(null);
  const [approvedPatchDecision, setApprovedPatchDecision] = useState<ApprovalDecisionResult | null>(
    null,
  );
  const [sessionMemory, setSessionMemory] = useState<SessionMemoryView | null>(null);
  const [sessionMemoryLoading, setSessionMemoryLoading] = useState(false);

  const [snapshot, setSnapshot] = useState<CreateSnapshotResult | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<SessionWorkspaceTab>('overview');
  const [resumedSessionId, setResumedSessionId] = useState<string | null>(null);
  const startReadiness = useMemo(
    () => ({
      hasProject: selectedProject !== null || projectRoot.trim().length > 0,
      hasProjectName: projectName.trim().length > 0,
      hasGoal: goal.trim().length > 0,
      canStart:
        projectRoot.trim().length > 0 && projectName.trim().length > 0 && goal.trim().length > 0,
    }),
    [goal, projectName, projectRoot, selectedProject],
  );
  const pendingQuestionCount = questions.length;

  const pendingHighPriorityQuestionCount = questions.filter((question) => {
    return question.priority === 'high' || question.priority === 'medium';
  }).length;

  const hasBlockingQuestionsBeforePlan =
    runtimePlan === null && pendingHighPriorityQuestionCount > 0;
  const workflowPrepared = Boolean(
    stackIntelligence ||
    apiRoutes ||
    frontendBackendLinks ||
    tasks.length > 0 ||
    packageScripts ||
    questions.length > 0 ||
    suggestions.length > 0,
  );
  function resetSessionArtifacts() {
    setSuggestions([]);
    setQuestions([]);
    setTasks([]);
    setTaskProgress(null);
    setVerifyCommands([]);
    setPackageScripts(null);
    setLastVerifyRun(null);
    setStackIntelligence(null);
    setApiRoutes(null);
    setFrontendBackendLinks(null);
    setContextGraph(null);
    setArtifactIndex(null);
    setSelectedArtifact(null);
    setSelectedArtifactContent('');
    setRuntimePlan(null);
    setRuntimeSettings(null);
    setPatchProposal(null);
    setPatchDiff(null);
    setPatchSandboxResult(null);
    setPatchRecoveryResult(null);
    setPatchRecoveryProposalLoading(false);
    setPatchApplyResult(null);
    setPatchRollbackResult(null);
    setReportExport(null);
    setRuntimeWorkflow(null);
    setApprovalCenter(null);
    setApprovedPatchFilePaths(null);
    setApprovedPatchDecision(null);
    setSessionMemory(null);
    setSnapshot(null);
    setResumedSessionId(null);
  }
  function moveToWorkspaceTab(tab: SessionWorkspaceTab): void {
    setActiveWorkspaceTab(tab);

    window.setTimeout(() => {
      const targetSelector = tab === 'context' ? '#context-tab-top' : '.session-workspace-tabs';

      document.querySelector(targetSelector)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }
  function moveToQuestions(): void {
    setActiveWorkspaceTab('overview');

    window.setTimeout(() => {
      document.querySelector('#runtime-questions-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  }
  function startNewSessionView() {
    setSession(null);
    onSessionChange(null);
    resetSessionArtifacts();
    setGoal('');
    setCommand('/plan');
    setActiveWorkspaceTab('overview');

    if (selectedProject) {
      setProjectRoot(selectedProject.rootPath);
      setProjectName(selectedProject.name);
    }
  }
  function selectGoalTemplate(nextGoal: string) {
    setGoal(nextGoal);

    window.setTimeout(() => {
      document.querySelector('#session-goal-field')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 80);
  }
  useEffect(() => {
    if (!selectedProject || session) {
      return;
    }

    setProjectRoot(selectedProject.rootPath);
    setProjectName(selectedProject.name);
  }, [selectedProject, session]);

  useEffect(() => {
    if (!initialSession || session) {
      return;
    }

    void resumeSession(initialSession);
  }, [initialSession, session]);

  function applyPreparedWorkflow(workflow: RuntimeWorkflowPrepareResult): void {
    setTasks(workflow.tasks.tasks);
    setTaskProgress(workflow.taskProgress);

    setStackIntelligence(workflow.stack);
    setApiRoutes(workflow.apiRoutes);
    setFrontendBackendLinks(workflow.frontendBackend);

    setQuestions(workflow.questions.questions);
    setSuggestions(workflow.suggestions);

    setPackageScripts(workflow.verifyScripts);
  }

  async function prepareWorkflowForSession(targetSession: InteractiveSessionState): Promise<void> {
    setWorkflowLoading(true);

    try {
      const workflow = await prepareRuntimeWorkflow({
        sessionId: targetSession.id,
        workspaceMode: 'local_snapshot',
        createDefaultTasks: true,
      });

      applyPreparedWorkflow(workflow);
    } finally {
      setWorkflowLoading(false);
    }
  }
  async function createSession() {
    setSessionStartLoading(true);

    try {
      const created = await startSession({
        projectRoot: projectRoot || selectedProject?.rootPath || '',
        projectName: projectName || selectedProject?.name || '',
        goal,
      });

      setSession(created);
      setResumedSessionId(null);
      onSessionChange(created);
      setActiveWorkspaceTab('overview');

      await prepareWorkflowForSession(created);

      void refreshRuntimeSettings();
      void refreshSessionMemory(created);
      void refreshArtifactStore(created.id);
    } finally {
      setSessionStartLoading(false);
    }
  }

  async function routeCommand(input = command) {
    if (!session) {
      return;
    }

    const updated = await sendSessionCommand({
      sessionId: session.id,
      command: input,
    });

    setSession(updated);
    onSessionChange(updated);
    void refreshSuggestions(updated);
    void refreshQuestions(updated);
    void refreshTasks(updated);
    void refreshSessionMemory(updated);
    void refreshArtifactStore(updated.id);
  }

  async function refreshSuggestions(targetSession = session) {
    if (!targetSession) {
      return;
    }

    setSuggestionsLoading(true);

    try {
      const result = await getSuggestions({
        projectRoot: targetSession.projectRoot,
        projectName: targetSession.projectName,
        workspaceMode: 'local_snapshot',
        gitAvailable: false,
        snapshotAvailable: targetSession.runtimeActions.some((action) =>
          `${action.title} ${action.description}`.toLowerCase().includes('snapshot'),
        ),
        runtimeActions: targetSession.runtimeActions.map((action) => ({
          title: action.title,
          description: action.description,
          status: action.status,
        })),
      });

      setSuggestions(result.suggestions);
    } finally {
      setSuggestionsLoading(false);
    }
  }

  async function refreshQuestions(targetSession = session) {
    if (!targetSession) {
      return;
    }

    setQuestionsLoading(true);

    try {
      const result = await getRuntimeQuestions({
        sessionId: targetSession.id,
        workspaceMode: 'local_snapshot',
        ...(stackIntelligence?.stack ? { stack: stackIntelligence.stack } : {}),
      });

      setQuestions(result.questions);
    } finally {
      setQuestionsLoading(false);
    }
  }

  async function answerQuestion(questionId: string, answer: string) {
    if (!session) {
      return;
    }

    await answerRuntimeQuestion({
      sessionId: session.id,
      questionId,
      answer,
      ...(stackIntelligence?.stack ? { stack: stackIntelligence.stack } : {}),
      workspaceMode: 'local_snapshot',
    });

    setQuestions((current) => current.filter((question) => question.id !== questionId));
  }

  async function refreshSessionMemory(targetSession = session) {
    if (!targetSession) {
      setSessionMemory(null);
      return;
    }

    setSessionMemoryLoading(true);

    try {
      const result = await getSessionMemory({
        sessionId: targetSession.id,
        projectRoot: targetSession.projectRoot,
        projectName: targetSession.projectName,
      });

      setSessionMemory(result.memory);
    } finally {
      setSessionMemoryLoading(false);
    }
  }

  async function addMemoryDecision(input: SessionMemoryDecisionDraft) {
    if (!session) {
      return;
    }

    await addSessionMemoryDecision({
      sessionId: session.id,
      category: input.category,
      strength: input.strength,
      statement: input.statement,
    });

    await refreshSessionMemory(session);
  }

  async function refreshTasks(targetSession = session) {
    if (!targetSession) {
      return;
    }

    setTasksLoading(true);

    try {
      const result = await getSessionTasks(targetSession.id);

      setTasks(result.tasks.tasks);
      setTaskProgress(result.progress);
    } finally {
      setTasksLoading(false);
    }
  }

  async function createDefaultTasks() {
    if (!session) {
      return;
    }

    const defaults: {
      title: string;
      description: string;
      kind: string;
    }[] = [
      {
        title: 'Analyze project stack',
        description: 'Detect frontend, backend, database and framework boundaries.',
        kind: 'inspect',
      },
      {
        title: 'Map backend API routes',
        description: 'Scan Express routes, controllers and middlewares.',
        kind: 'context',
      },
      {
        title: 'Link frontend API usage',
        description: 'Connect frontend fetch/axios usage with backend endpoints.',
        kind: 'context',
      },
      {
        title: 'Prepare safe verification',
        description: 'Detect safe scripts and approved verification commands.',
        kind: 'verify',
      },
    ];

    const firstTask = defaults[0];

    if (!firstTask) {
      return;
    }

    let latest = await createSessionTask({
      sessionId: session.id,
      title: firstTask.title,
      description: firstTask.description,
      kind: firstTask.kind,
    });

    for (const task of defaults.slice(1)) {
      latest = await createSessionTask({
        sessionId: session.id,
        title: task.title,
        description: task.description,
        kind: task.kind,
      });
    }

    setTasks(latest.tasks.tasks);
    setTaskProgress(latest.progress);
  }

  async function transitionTask(taskId: string, status: SessionTask['status']) {
    if (!session) {
      return;
    }

    const result = await transitionSessionTask({
      sessionId: session.id,
      taskId,
      status,
    });

    setTasks(result.tasks.tasks);
    setTaskProgress(result.progress);
  }

  async function refreshVerify(targetSession = session) {
    if (!targetSession) {
      return;
    }

    setVerifyLoading(true);

    try {
      const [commands, scripts] = await Promise.all([
        listVerifyCommands(),
        scanPackageScripts(targetSession.projectRoot),
      ]);

      setVerifyCommands(commands);
      setPackageScripts(scripts);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function runVerify(commandDefinition: VerifyCommandDefinition) {
    if (!session) {
      return;
    }

    setVerifyLoading(true);

    try {
      const result = await runVerifyCommand({
        sessionId: session.id,
        command: commandDefinition.command,
        args: commandDefinition.args,
        cwd: session.projectRoot,
        approved: true,
      });

      setLastVerifyRun(result);
      moveToWorkspaceTab('verify');
    } finally {
      setVerifyLoading(false);
    }
  }

  async function refreshArtifactStore(targetSessionId?: string): Promise<void> {
    setArtifactLoading(true);

    try {
      const result = await listRuntimeArtifacts();

      setArtifactIndex(result.artifactIndex);

      const sessionId = targetSessionId ?? session?.id ?? null;

      if (!sessionId) {
        return;
      }

      const preferredArtifact = findPreferredArtifactForSession(result.artifactIndex, sessionId);

      if (!preferredArtifact) {
        return;
      }

      setSelectedArtifact(preferredArtifact);

      const readResult = await readRuntimeArtifact(preferredArtifact.path);

      setSelectedArtifact(readResult.artifact);
      setSelectedArtifactContent(readResult.content);
    } finally {
      setArtifactLoading(false);
    }
  }
  function findPreferredArtifactForSession(
    index: RuntimeArtifactIndex,
    sessionId: string,
  ): RuntimeArtifactSummary | null {
    const artifacts = index.artifacts.filter((artifact) => artifact.sessionId === sessionId);

    if (artifacts.length === 0) {
      return null;
    }

    const priority = [
      'report_markdown',
      'report_json',
      'session_state',
      'active_plan',
      'runtime_plan',
      'active_patch_diff',
      'patch_diff',
      'sandbox_result',
    ];

    return (
      artifacts.slice().sort((a, b) => {
        const priorityA = priority.indexOf(a.kind);
        const priorityB = priority.indexOf(b.kind);
        const safePriorityA = priorityA === -1 ? priority.length : priorityA;
        const safePriorityB = priorityB === -1 ? priority.length : priorityB;

        if (safePriorityA !== safePriorityB) {
          return safePriorityA - safePriorityB;
        }

        return (b.updatedAt ?? b.createdAt ?? '').localeCompare(a.updatedAt ?? a.createdAt ?? '');
      })[0] ?? null
    );
  }
  async function refreshSavedSessions() {
    setSavedSessionsLoading(true);

    try {
      const result = await listSessions();

      setSavedSessions(result.sessions);
    } finally {
      setSavedSessionsLoading(false);
    }
  }

  async function resumeSession(nextSession: InteractiveSessionState): Promise<void> {
    resetSessionArtifacts();

    setSession(nextSession);
    setProjectRoot(nextSession.projectRoot);
    setProjectName(nextSession.projectName);
    setGoal(nextSession.goal.current);
    setResumedSessionId(nextSession.id);
    onSessionChange(nextSession);
    setActiveWorkspaceTab('overview');

    await Promise.all([
      refreshSuggestions(nextSession),
      refreshQuestions(nextSession),
      refreshTasks(nextSession),
      refreshVerify(nextSession),
      refreshRuntimeSettings(),
      refreshSessionMemory(nextSession),
      refreshArtifactStore(nextSession.id),
    ]);

    window.setTimeout(() => {
      void refreshRuntimeWorkflowState();
      void refreshApprovalCenter();
    }, 120);
  }

  async function selectArtifact(artifact: RuntimeArtifactSummary) {
    setSelectedArtifact(artifact);
    setArtifactLoading(true);

    try {
      const result = await readRuntimeArtifact(artifact.path);

      setSelectedArtifact(result.artifact);
      setSelectedArtifactContent(result.content);
    } finally {
      setArtifactLoading(false);
    }
  }

  async function analyzeProject() {
    if (!session) {
      return;
    }

    setIntelligenceLoading(true);

    try {
      const [stack, routes, links] = await Promise.all([
        detectProjectStack(session.projectRoot),
        mapApiRoutes(session.projectRoot),
        linkFrontendBackend(session.projectRoot),
      ]);

      setStackIntelligence(stack);
      setApiRoutes(routes);
      setFrontendBackendLinks(links);
    } finally {
      setIntelligenceLoading(false);
    }
  }

  async function analyzeContextGraph(input: { query: string; targetFilePath: string }) {
    if (!session) {
      return;
    }

    const query = input.query || session.goal.current;
    const targetFilePath = input.targetFilePath || collectKnownFiles()[0];

    setContextGraphLoading(true);

    try {
      const result = await generateContextGraph({
        projectRoot: session.projectRoot,
        query,
        ...(targetFilePath ? { targetFilePath } : {}),
        maxChunks: 8,
        maxRelatedFiles: 8,
        maxFilesToScan: 10,
      });

      setContextGraph(result.contextGraph);
    } finally {
      setContextGraphLoading(false);
    }
  }

  async function exportReport() {
    if (!session) {
      return;
    }

    setReportLoading(true);

    try {
      const result = await exportSessionReport(session.id);

      setReportExport(result);
      moveToWorkspaceTab('artifacts');
      void refreshArtifactStore(session.id);
    } finally {
      setReportLoading(false);
    }
  }

  async function prepareWorkflow() {
    if (!session) {
      return;
    }

    await prepareWorkflowForSession(session);
    moveToWorkspaceTab('context');
  }

  function collectKnownFiles(): string[] {
    const files = new Set<string>();

    for (const route of apiRoutes?.routes ?? []) {
      files.add(route.sourceFile);

      if (route.controller?.resolvedFile) {
        files.add(route.controller.resolvedFile);
      }

      for (const middleware of route.middlewares) {
        if (middleware.resolvedFile) {
          files.add(middleware.resolvedFile);
        }
      }
    }

    for (const usage of frontendBackendLinks?.usages ?? []) {
      files.add(usage.sourceFile);
    }

    for (const link of frontendBackendLinks?.links ?? []) {
      files.add(link.usage.sourceFile);

      if (link.route?.sourceFile) {
        files.add(link.route.sourceFile);
      }
    }

    return [...files].filter((file) => file.trim().length > 0);
  }

  function selectedPatchFiles(): string[] | null {
    if (approvedPatchFilePaths && approvedPatchFilePaths.length > 0) {
      return approvedPatchFilePaths;
    }

    return null;
  }
  function isReadOnlyPlan(): boolean {
    return runtimePlan?.plan.mode === 'read_only';
  }

  function buildWorkflowArtifactState(): RuntimeWorkflowArtifactState {
    const sandboxPassed = patchSandboxResult?.status === 'passed';
    const sandboxFailed = patchSandboxResult?.status === 'failed';
    const sandboxBlocked = patchSandboxResult?.status === 'blocked';

    const recoveryAvailable = sandboxFailed || sandboxBlocked || patchRecoveryResult !== null;
    const recoveryPrepared = patchRecoveryResult?.status === 'repair_prompt_ready';
    const recoveryMaxAttemptsReached = patchRecoveryResult?.status === 'max_attempts_reached';

    const repairedProposalGenerated =
      patchRecoveryResult !== null &&
      patchProposal !== null &&
      patchProposal.proposal.id !== patchRecoveryResult.proposalId;

    const planMode = runtimePlan?.plan.mode ?? null;
    const readOnly = planMode === 'read_only';

    return {
      sessionStarted: session !== null,
      workflowPrepared,
      pendingQuestionCount,
      pendingHighPriorityQuestionCount,
      planValid: runtimePlan?.validation.valid === true,
      planRejected: runtimePlan?.validation.valid === false,
      planMode,
      patchProposalValid: readOnly ? false : patchProposal?.validation.valid === true,
      patchProposalRejected: readOnly ? false : patchProposal?.validation.valid === false,
      diffReady: readOnly ? false : patchDiff?.diff.safeToPreview === true,
      diffBlocked: readOnly ? false : patchDiff ? !patchDiff.diff.safeToPreview : false,

      sandboxPassed: readOnly ? false : sandboxPassed,
      sandboxFailed: readOnly ? false : sandboxFailed,
      sandboxBlocked: readOnly ? false : sandboxBlocked,

      recoveryAvailable: readOnly ? false : recoveryAvailable,
      recoveryPrepared: readOnly ? false : recoveryPrepared,
      recoveryMaxAttemptsReached: readOnly ? false : recoveryMaxAttemptsReached,
      repairedProposalGenerated: readOnly ? false : repairedProposalGenerated,

      snapshotAvailable: readOnly ? false : snapshot !== null,
      dryRunCompleted: readOnly
        ? false
        : patchApplyResult?.status === 'dry_run' || patchApplyResult?.status === 'applied',
      applyApplied: readOnly ? false : patchApplyResult?.status === 'applied',
      applyBlocked: readOnly ? false : patchApplyResult?.status === 'blocked',
      applyFailed: readOnly ? false : patchApplyResult?.status === 'failed',
      rollbackDryRunCompleted: readOnly
        ? false
        : patchRollbackResult?.status === 'dry_run' ||
          patchRollbackResult?.status === 'rolled_back',
      rollbackCompleted: readOnly ? false : patchRollbackResult?.status === 'rolled_back',
      rollbackBlocked: readOnly ? false : patchRollbackResult?.status === 'blocked',
      rollbackFailed: readOnly ? false : patchRollbackResult?.status === 'failed',
      verifyCompleted: readOnly
        ? false
        : (lastVerifyRun?.status === 'executed' && lastVerifyRun.exitCode === 0) || sandboxPassed,
      reportExported: reportExport !== null,
      riskLevel: runtimePlan?.plan.riskLevel ?? patchProposal?.proposal.riskLevel ?? null,
    };
  }

  function buildApprovalArtifactState(): ApprovalCenterArtifactState | null {
    if (!session) {
      return null;
    }

    const planMode = runtimePlan?.plan.mode ?? null;
    const readOnly = planMode === 'read_only';

    return {
      sessionId: session.id,
      projectRoot: session.projectRoot,
      plan: runtimePlan?.plan ?? null,
      planMode,
      proposal: readOnly ? null : (patchProposal?.proposal ?? null),
      diff: readOnly ? null : (patchDiff?.diff ?? null),
      applyResult: readOnly ? null : patchApplyResult,
      lastVerifyRun: readOnly ? null : lastVerifyRun,
      snapshotAvailable: readOnly ? false : snapshot !== null,
      dirtyWorkingTree: false,
    };
  }

  async function refreshApprovalCenter() {
    const artifactState = buildApprovalArtifactState();

    if (!artifactState) {
      setApprovalCenter(null);
      return;
    }

    setApprovalCenterLoading(true);

    try {
      const result = await buildApprovalCenter({
        artifactState,
      });

      setApprovalCenter(result.approvalCenter);
    } finally {
      setApprovalCenterLoading(false);
    }
  }

  async function handleApprovalDecision(input: ApprovalDecisionInput) {
    const artifactState = buildApprovalArtifactState();

    if (!session || !artifactState) {
      return;
    }

    const request = approvalCenter?.requests.find((candidate) => candidate.id === input.requestId);

    const result = await resolveApproval({
      artifactState,
      decision: input,
    });

    setApprovalCenter(result.approvalCenter);

    if (!result.decision.accepted) {
      return;
    }

    if (input.action === 'reject') {
      await routeCommand(`/reject ${input.reason ?? 'Approval rejected by user.'}`);
      clearPlanAndDownstreamArtifacts();
      moveToWorkspaceTab('overview');
      await refreshRuntimeWorkflowState();
      return;
    }

    if (input.action === 'ask_revision') {
      await routeCommand(`/revise ${input.reason ?? 'Approval requested revision.'}`);
      clearPlanAndDownstreamArtifacts();
      moveToWorkspaceTab('overview');
      await refreshRuntimeWorkflowState();
      return;
    }

    if (request?.kind === 'plan') {
      setApprovedPatchDecision(result.decision);

      if (runtimePlan?.plan.mode === 'read_only') {
        moveToWorkspaceTab('overview');
        await routeCommand('Read-only runtime plan approved. Patch flow remains disabled.');
        await refreshApprovalCenter();
        await refreshRuntimeWorkflowState();
        return;
      }

      moveToWorkspaceTab('plan');
      await routeCommand(`Runtime plan approved: ${request.title}`);
      await refreshApprovalCenter();
      await refreshRuntimeWorkflowState();
      return;
    }

    if (request?.kind === 'verify') {
      const commandToRun =
        patchProposal?.proposal.verifyCommands[0] ?? runtimePlan?.plan.verifyCommands[0];

      if (commandToRun) {
        await runVerify({
          id: commandToRun.args.join('-'),
          label: commandToRun.args.join(' '),
          command: commandToRun.command,
          args: commandToRun.args,
          description: commandToRun.reason,
        });
      }

      await refreshApprovalCenter();
      await refreshRuntimeWorkflowState();
      return;
    }

    if (request?.kind === 'rollback') {
      await rollbackPatch({
        confirmedText: 'ROLLBACK',
      });

      await refreshApprovalCenter();
      await refreshRuntimeWorkflowState();
      return;
    }

    if (request?.kind === 'patch') {
      if (runtimePlan?.plan.mode === 'read_only') {
        await routeCommand('Patch approval ignored because current runtime plan is read-only.');
        clearPlanAndDownstreamArtifacts();
        moveToWorkspaceTab('overview');
        await refreshRuntimeWorkflowState();
        return;
      }

      const nextSelectedFiles =
        input.action === 'approve_selected_files'
          ? result.decision.selectedFilePaths
          : request.filePaths;

      setApprovedPatchFilePaths(nextSelectedFiles);
      setApprovedPatchDecision(result.decision);
      moveToWorkspaceTab('patch');

      await generateDiff(nextSelectedFiles);
      await refreshApprovalCenter();
      await refreshRuntimeWorkflowState();
      return;
    }

    await routeCommand(`Approval accepted: ${request?.title ?? input.requestId}`);
    await refreshApprovalCenter();
    await refreshRuntimeWorkflowState();
  }
  function findPlanApprovalRequestId(): string | null {
    const request = approvalCenter?.requests.find(
      (candidate) => candidate.kind === 'plan' && candidate.status === 'pending',
    );

    return request?.id ?? null;
  }

  function clearPlanAndDownstreamArtifacts(): void {
    setRuntimePlan(null);
    setPatchProposal(null);
    setPatchDiff(null);
    setPatchSandboxResult(null);
    setPatchRecoveryResult(null);
    setPatchApplyResult(null);
    setPatchRollbackResult(null);
    setApprovedPatchFilePaths(null);
    setApprovedPatchDecision(null);
    setRuntimeWorkflow(null);
    setApprovalCenter(null);
    setSnapshot(null);
    setLastVerifyRun(null);
  }

  async function approvePlanAction(): Promise<void> {
    const requestId = findPlanApprovalRequestId();

    if (requestId) {
      await handleApprovalDecision({
        requestId,
        action: 'approve',
      });
    } else {
      await routeCommand('Runtime plan approved by user.');
    }

    await refreshRuntimeWorkflowState();
    await refreshApprovalCenter();
    moveToWorkspaceTab('overview');
  }

  async function requestPlanChangesAction(): Promise<void> {
    if (!session) {
      clearPlanAndDownstreamArtifacts();
      moveToWorkspaceTab('overview');
      return;
    }

    const planApprovalRequestId = findPlanApprovalRequestId();

    if (planApprovalRequestId) {
      const artifactState = buildApprovalArtifactState();

      if (artifactState) {
        await resolveApproval({
          artifactState,
          decision: {
            requestId: planApprovalRequestId,
            action: 'ask_revision',
            reason: 'User requested plan changes before continuing.',
          },
        });
      }
    }

    await routeCommand('Plan revision requested. Current plan cleared; regenerate when ready.');
    clearPlanAndDownstreamArtifacts();
    moveToWorkspaceTab('overview');
  }

  async function addPlanRestrictionAction(): Promise<void> {
    if (!session) {
      return;
    }

    const statement =
      'Do not use generated build output folders like .open-next, dist, build, node_modules or cache directories as candidate files. Prefer source files, app/pages/components/api routes/config files and package scripts.';

    await addSessionMemoryDecision({
      sessionId: session.id,
      category: 'scope',
      strength: 'hard_rule',
      statement,
    });

    await routeCommand(`Restriction added: ${statement}`);
    await refreshSessionMemory(session);

    clearPlanAndDownstreamArtifacts();
    moveToWorkspaceTab('memory');
  }

  function viewPlanContextAction(): void {
    if (!session) {
      return;
    }

    if (!workflowPrepared) {
      void prepareWorkflow();
      return;
    }

    setActiveWorkspaceTab('context');

    window.setTimeout(() => {
      document.querySelector('#context-tab-top')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  }

  async function cancelPlanAction(): Promise<void> {
    if (!session) {
      clearPlanAndDownstreamArtifacts();
      moveToWorkspaceTab('overview');
      return;
    }

    const planApprovalRequestId = findPlanApprovalRequestId();

    if (planApprovalRequestId) {
      const artifactState = buildApprovalArtifactState();

      if (artifactState) {
        await resolveApproval({
          artifactState,
          decision: {
            requestId: planApprovalRequestId,
            action: 'reject',
            reason: 'Plan cancelled by user. Evidence preserved.',
          },
        });
      }
    }

    await routeCommand('Plan cancelled. Evidence preserved.');
    clearPlanAndDownstreamArtifacts();
    moveToWorkspaceTab('overview');
  }
  async function refreshRuntimeWorkflowState() {
    if (!session) {
      setRuntimeWorkflow(null);
      return;
    }

    setRuntimeWorkflowLoading(true);

    try {
      const result = await buildRuntimeWorkflowState({
        artifactState: buildWorkflowArtifactState(),
      });

      setRuntimeWorkflow(result);
    } finally {
      setRuntimeWorkflowLoading(false);
    }
  }

  async function generatePlan(useProvider = false) {
    if (!session) {
      return;
    }
    if (hasBlockingQuestionsBeforePlan) {
      await routeCommand(
        `Runtime plan blocked: ${pendingHighPriorityQuestionCount} high/medium priority question(s) should be answered first.`,
      );

      moveToQuestions();
      await refreshRuntimeWorkflowState();
      return;
    }
    setRuntimePlanLoading(true);

    try {
      const settings = runtimeSettings ?? (await getRuntimeSettings());

      setRuntimeSettings(settings);

      const result = await generateRuntimePlan({
        sessionId: session.id,
        instruction: session.goal.current,
        workspaceMode: 'local_snapshot',
        useProvider,
        model: settings.model.defaultModel,
        ...(stackIntelligence?.stack ? { stack: stackIntelligence.stack } : {}),
        ...(collectKnownFiles().length > 0 ? { knownFiles: collectKnownFiles() } : {}),
      });

      setRuntimePlan(result);
      moveToWorkspaceTab('plan');
      const refreshed = await sendSessionCommand({
        sessionId: session.id,
        command:
          result.source === 'provider'
            ? 'Plan runtime generado con provider y registrado.'
            : result.source === 'fallback'
              ? 'Plan runtime generado con fallback determinístico y registrado.'
              : 'Plan runtime determinístico generado y registrado.',
      });

      setSession(refreshed);
    } finally {
      setRuntimePlanLoading(false);
    }
  }

  async function generatePatch() {
    if (!session || !runtimePlan || !runtimePlan.validation.valid) {
      return;
    }

    if (runtimePlan.plan.mode === 'read_only') {
      await routeCommand('Patch proposal blocked: current runtime plan is read-only.');
      setPatchProposal(null);
      setPatchDiff(null);
      setPatchSandboxResult(null);
      setPatchApplyResult(null);
      setApprovalCenter(null);
      moveToWorkspaceTab('plan');
      return;
    }

    setPatchProposalLoading(true);

    try {
      const settings = runtimeSettings ?? (await getRuntimeSettings());

      setRuntimeSettings(settings);

      const result = await generatePatchProposal({
        sessionId: session.id,
        planId: runtimePlan.plan.id,
        summary: runtimePlan.plan.objective,
        riskLevel: runtimePlan.plan.riskLevel,
        useProvider: runtimePlan.source === 'provider',
        model: settings.model.defaultModel,
        candidateFiles: runtimePlan.plan.scope.candidateFiles.map((file) => ({
          path: file.path,
          existsKnown: file.existsKnown,
          reason: file.reason,
        })),
        verifyCommands: runtimePlan.plan.verifyCommands,
      });

      setPatchProposal(result);
      setApprovedPatchFilePaths(null);
      setApprovedPatchDecision(null);
      setPatchDiff(null);
      setPatchSandboxResult(null);
      setPatchRecoveryResult(null);
      setPatchApplyResult(null);
      setPatchRollbackResult(null);
      moveToWorkspaceTab('patch');

      const refreshed = await sendSessionCommand({
        sessionId: session.id,
        command: 'Patch proposal generado y registrado. No se aplicaron archivos.',
      });

      setSession(refreshed);
    } finally {
      setPatchProposalLoading(false);
    }
  }

  async function generateDiff(selectedFilePaths: string[] | null = selectedPatchFiles()) {
    if (!session || !patchProposal || !patchProposal.validation.valid) {
      return;
    }

    setPatchDiffLoading(true);

    try {
      const result = await generatePatchDiff({
        proposal: patchProposal.proposal,
        ...(selectedFilePaths && selectedFilePaths.length > 0 ? { selectedFilePaths } : {}),
      });

      setPatchDiff(result);
      setPatchSandboxResult(null);
      setPatchRecoveryResult(null);
      setPatchApplyResult(null);
      setPatchRollbackResult(null);
      moveToWorkspaceTab('patch');

      const refreshed = await sendSessionCommand({
        sessionId: session.id,
        command:
          selectedFilePaths && selectedFilePaths.length > 0
            ? `Patch diff preview generado para ${selectedFilePaths.length} archivo(s) aprobado(s). No se aplicaron archivos.`
            : 'Patch diff preview generado y registrado. No se aplicaron archivos.',
      });

      setSession(refreshed);
    } finally {
      setPatchDiffLoading(false);
    }
  }
  async function verifySandbox(selectedFilePaths: string[] | null = selectedPatchFiles()) {
    if (!session || !patchProposal || !patchProposal.validation.valid) {
      return;
    }

    setPatchSandboxLoading(true);

    try {
      const result = await verifyPatchSandbox({
        proposal: patchProposal.proposal,
        ...(selectedFilePaths && selectedFilePaths.length > 0 ? { selectedFilePaths } : {}),
      });

      setPatchSandboxResult(result.sandbox);
      setPatchRecoveryResult(null);
      moveToWorkspaceTab('patch');

      const refreshed = await sendSessionCommand({
        sessionId: session.id,
        command:
          selectedFilePaths && selectedFilePaths.length > 0
            ? `Patch sandbox verification terminó con estado ${result.sandbox.status} sobre ${selectedFilePaths.length} archivo(s) aprobado(s).`
            : `Patch sandbox verification terminó con estado ${result.sandbox.status}.`,
      });

      setSession(refreshed);
      void refreshArtifactStore();
    } finally {
      setPatchSandboxLoading(false);
    }
  }
  async function prepareRecovery() {
    if (!session || !patchProposal || !patchSandboxResult) {
      return;
    }

    if (patchSandboxResult.status === 'passed') {
      return;
    }

    setPatchRecoveryLoading(true);

    try {
      const result = await preparePatchRecovery({
        originalObjective: session.goal.current || session.goal.original,
        proposal: patchProposal.proposal,
        sandboxResult: patchSandboxResult,
        maxAttempts: 2,
      });

      setPatchRecoveryResult(result.recovery);
      moveToWorkspaceTab('patch');

      const refreshed = await sendSessionCommand({
        sessionId: session.id,
        command: `Patch recovery preparado con estado ${result.recovery.status}.`,
      });

      setSession(refreshed);
      void refreshArtifactStore();
    } finally {
      setPatchRecoveryLoading(false);
    }
  }
  async function generateRecoveryProposal() {
    if (!session || !patchProposal || !patchRecoveryResult) {
      return;
    }

    if (patchRecoveryResult.status !== 'repair_prompt_ready') {
      return;
    }

    setPatchRecoveryProposalLoading(true);

    try {
      const result = await generatePatchRecoveryProposal({
        originalProposal: patchProposal.proposal,
        recovery: patchRecoveryResult,
        ...(runtimeSettings?.model.defaultModel
          ? { model: runtimeSettings.model.defaultModel }
          : {}),
      });

      setPatchProposal({
        proposal: result.proposal,
        validation: result.validation,
        files: result.files,
      });

      setPatchDiff(null);
      setPatchSandboxResult(null);
      setPatchApplyResult(null);
      setPatchRollbackResult(null);
      setApprovedPatchFilePaths(null);
      setApprovedPatchDecision(null);
      moveToWorkspaceTab('patch');

      const refreshed = await sendSessionCommand({
        sessionId: session.id,
        command: `Provider generó propuesta reparada ${result.proposal.id}. Revisar diff y sandbox nuevamente.`,
      });

      setSession(refreshed);
      void refreshApprovalCenter();
      void refreshArtifactStore();
    } finally {
      setPatchRecoveryProposalLoading(false);
    }
  }
  async function dryRunApplyPatch(selectedFilePaths: string[] | null = selectedPatchFiles()) {
    if (!session || !patchProposal || !patchDiff) {
      return;
    }

    setPatchApplyLoading(true);

    try {
      const result = await applyRuntimePatch({
        proposal: patchProposal.proposal,
        diff: patchDiff.diff,
        applyConfirmed: false,
        dryRun: true,
        allowDirtyWorkingTree: false,
        allowMissingRepository: false,
        backupEnabled: true,
        ...(selectedFilePaths && selectedFilePaths.length > 0 ? { selectedFilePaths } : {}),
      });

      setPatchApplyResult(result.apply);
      setPatchRollbackResult(null);
      moveToWorkspaceTab('patch');
      const refreshed = await sendSessionCommand({
        sessionId: session.id,
        command:
          selectedFilePaths && selectedFilePaths.length > 0
            ? `Patch apply dry-run ejecutado sobre ${selectedFilePaths.length} archivo(s) aprobado(s). No se aplicaron archivos.`
            : 'Patch apply dry-run ejecutado. No se aplicaron archivos.',
      });

      setSession(refreshed);
    } finally {
      setPatchApplyLoading(false);
    }
  }

  async function dryRunRollbackPatch() {
    if (!session || !patchApplyResult) {
      return;
    }

    setPatchRollbackLoading(true);

    try {
      const result = await rollbackRuntimePatch({
        applyResult: patchApplyResult,
        rollbackConfirmed: false,
        dryRun: true,
      });

      setPatchRollbackResult(result.rollback);

      const refreshed = await sendSessionCommand({
        sessionId: session.id,
        command: 'Patch rollback dry-run ejecutado. No se restauraron archivos.',
      });

      setSession(refreshed);
    } finally {
      setPatchRollbackLoading(false);
    }
  }

  async function rollbackPatch(input: { confirmedText: string }) {
    if (!session || !patchApplyResult || input.confirmedText !== 'ROLLBACK') {
      return;
    }

    setPatchRollbackLoading(true);

    try {
      const result = await rollbackRuntimePatch({
        applyResult: patchApplyResult,
        rollbackConfirmed: true,
      });

      setPatchRollbackResult(result.rollback);

      const refreshed = await sendSessionCommand({
        sessionId: session.id,
        command: `Patch rollback ejecutado con estado ${result.rollback.status}.`,
      });

      setSession(refreshed);
    } finally {
      setPatchRollbackLoading(false);
    }
  }

  async function applyPatch(input: {
    confirmedText: string;
    allowDirtyWorkingTree: boolean;
    selectedFilePaths?: string[];
  }) {
    if (!session || !patchProposal || !patchDiff || input.confirmedText !== 'APPLY') {
      return;
    }

    const selectedFilePaths = input.selectedFilePaths ?? selectedPatchFiles();

    setPatchApplyLoading(true);

    try {
      const result = await applyRuntimePatch({
        proposal: patchProposal.proposal,
        diff: patchDiff.diff,
        applyConfirmed: true,
        allowDirtyWorkingTree: input.allowDirtyWorkingTree,
        allowMissingRepository: false,
        backupEnabled: true,
        ...(selectedFilePaths && selectedFilePaths.length > 0 ? { selectedFilePaths } : {}),
        ...(snapshot?.snapshot.snapshotId ? { snapshotId: snapshot.snapshot.snapshotId } : {}),
        ...(approvedPatchDecision ? { approvalDecision: approvedPatchDecision } : {}),
        ...(patchSandboxResult ? { sandboxResult: patchSandboxResult } : {}),
      });

      setPatchApplyResult(result.apply);
      setPatchRollbackResult(null);
      moveToWorkspaceTab('patch');

      const refreshed = await sendSessionCommand({
        sessionId: session.id,
        command:
          selectedFilePaths && selectedFilePaths.length > 0
            ? `Patch apply ejecutado con estado ${result.apply.status} sobre ${selectedFilePaths.length} archivo(s) aprobado(s).`
            : `Patch apply ejecutado con estado ${result.apply.status}.`,
      });

      setSession(refreshed);
    } finally {
      setPatchApplyLoading(false);
    }
  }

  async function refreshRuntimeSettings() {
    const settings = await getRuntimeSettings();

    setRuntimeSettings(settings);
  }

  async function createSessionSnapshot(targetFiles: string[]) {
    if (!session) {
      return;
    }

    setSnapshotLoading(true);

    try {
      const result = await createSnapshot({
        projectRoot: session.projectRoot,
        sessionId: session.id,
        targetFiles,
      });

      setSnapshot(result);
      void refreshSuggestions(session);
    } finally {
      setSnapshotLoading(false);
    }
  }
  function SessionStartStep({
    number,
    label,
    done,
  }: {
    number: string;
    label: string;
    done: boolean;
  }) {
    return (
      <div className={`flex items-center gap-2 ${done ? 'text-emerald-400' : 'text-zinc-500'}`}>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold border ${done ? 'bg-emerald-500/10 border-emerald-500/20' : 'border-zinc-700'}`}
        >
          {number}
        </span>
        <strong className="text-sm font-medium">{label}</strong>
      </div>
    );
  }
  function StartReadinessItem({
    icon,
    label,
    detail,
    done,
  }: {
    icon: React.ReactNode;
    label: string;
    detail: string;
    done: boolean;
  }) {
    return (
      <div
        className={`flex items-start gap-3 p-3 rounded-lg border ${done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/30'}`}
      >
        <span className={`mt-0.5 ${done ? 'text-emerald-400' : 'text-zinc-500'}`}>{icon}</span>
        <div className="flex-1">
          <strong className={`block text-sm ${done ? 'text-zinc-200' : 'text-zinc-400'}`}>
            {label}
          </strong>
          <p className="text-xs text-zinc-500 mt-0.5">{detail}</p>
        </div>
        <Badge tone={done ? 'green' : 'slate'}>{done ? 'ready' : 'waiting'}</Badge>
      </div>
    );
  }
  function DemoCompletionItem({ done, label }: { done: boolean; label: string }) {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border ${done ? 'border-emerald-500/20 bg-emerald-500/5 text-zinc-200' : 'border-zinc-800 bg-zinc-950/50 text-zinc-500'}`}
      >
        <Badge tone={done ? 'green' : 'slate'}>{done ? 'done' : 'todo'}</Badge>
        <span className="text-sm font-medium">{label}</span>
      </div>
    );
  }

  function OverviewMetricCard({
    label,
    value,
    detail,
    tone,
  }: {
    label: string;
    value: string;
    detail: string;
    tone: 'blue' | 'green' | 'yellow' | 'red' | 'slate';
  }) {
    return (
      <article className="rounded-xl border border-zinc-800/60 bg-zinc-900/35 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {label}
          </span>
          <Badge tone={tone}>{value}</Badge>
        </div>
        <p className="mt-2 text-xs text-zinc-500 leading-relaxed">{detail}</p>
      </article>
    );
  }
  function ResumedSessionNotice({
    session,
    artifactCount,
    onOpenArtifacts,
    onRefreshArtifacts,
  }: {
    session: InteractiveSessionState;
    artifactCount: number;
    onOpenArtifacts: () => void;
    onRefreshArtifacts: () => void;
  }) {
    return (
      <article className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">resumed</Badge>
              <Badge tone={artifactCount > 0 ? 'green' : 'yellow'}>
                {artifactCount} session artifacts
              </Badge>
            </div>

            <h2 className="mt-3 text-lg font-semibold text-zinc-100">
              Session restored from runtime state
            </h2>

            <p className="mt-1 text-sm text-zinc-400 leading-relaxed max-w-3xl">
              The live React workflow state may not contain the previous plan, patch or report until
              you regenerate or inspect evidence. Runtime artifacts are preserved and can be
              reviewed from the Artifact Store.
            </p>

            <p className="mt-2 text-xs font-mono text-zinc-500 truncate">{session.id}</p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              onClick={onOpenArtifacts}
            >
              Open artifacts
            </button>

            <button
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
              onClick={onRefreshArtifacts}
            >
              Refresh evidence
            </button>
          </div>
        </div>
      </article>
    );
  }
  function SecondaryToolsDetails({
    children,
    timelineCount,
  }: {
    children: React.ReactNode;
    timelineCount: number;
  }) {
    return (
      <details className="group rounded-xl border border-zinc-800/60 bg-zinc-950/30 shadow-sm [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 select-none">
          <div>
            <strong className="block text-sm font-semibold text-zinc-200">
              Secondary tools and evidence
            </strong>
            <p className="mt-1 text-xs text-zinc-500">
              Chat, suggestions, saved sessions and recent timeline are available here without
              competing with the main runtime action.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge tone={timelineCount > 0 ? 'blue' : 'slate'}>{timelineCount} events</Badge>
            <span className="text-xs font-medium text-indigo-400 group-open:hidden">Show</span>
            <span className="hidden text-xs font-medium text-indigo-400 group-open:inline">
              Hide
            </span>
          </div>
        </summary>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-zinc-800/60 p-5">
          {children}
        </div>
      </details>
    );
  }

  useEffect(() => {
    void refreshSavedSessions();
  }, []);

  useEffect(() => {
    if (!session) {
      setRuntimeWorkflow(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshRuntimeWorkflowState();
      void refreshApprovalCenter();
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    session,
    stackIntelligence,
    apiRoutes,
    frontendBackendLinks,
    tasks,
    packageScripts,
    questions,
    suggestions,
    runtimePlan,
    patchProposal,
    patchDiff,
    patchSandboxResult,
    patchRecoveryResult,
    snapshot,
    patchApplyResult,
    patchRollbackResult,
    lastVerifyRun,
    reportExport,
  ]);

  return (
    <section className="flex flex-col gap-6 w-full max-w-400 mx-auto pb-12">
      <RuntimeStatusBar session={session} workspaceMode={selectedProject?.workingMode ?? null} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-5">
        <div>
          <strong className="text-xl font-semibold text-zinc-100 block">
            {session ? session.projectName : (selectedProject?.name ?? 'No project selected')}
          </strong>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl truncate">
            {session
              ? session.goal.current
              : selectedProject
                ? selectedProject.rootPath
                : 'Select a project before starting a session.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors"
            onClick={() => void refreshSavedSessions()}
          >
            Refresh sessions
          </button>

          <button
            className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-medium transition-colors"
            onClick={startNewSessionView}
          >
            New session
          </button>
        </div>
      </div>

      {/* Start Session Flow */}
      {!session ? (
        <article
          id="session-start-panel"
          className="flex flex-col gap-8 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 lg:p-8 shadow-sm backdrop-blur-md"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center gap-1.5 text-indigo-400 text-sm font-medium uppercase tracking-wider">
                  <Sparkles size={16} /> Guided session
                </span>
                <Badge tone={selectedProject ? 'green' : 'yellow'}>
                  {selectedProject ? 'project ready' : 'project required'}
                </Badge>
              </div>
              <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight mb-3">
                Create your guided runtime session
              </h1>
              <p className="text-base text-zinc-400 leading-relaxed">
                Zero will guide you one safe step at a time: prepare context, create a plan, review
                a patch, verify in sandbox and export evidence.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <StartReadinessItem
                icon={<FolderKanban size={17} />}
                label="Project"
                done={startReadiness.hasProject}
                detail={selectedProject?.name ?? 'Select a project first'}
              />
              <StartReadinessItem
                icon={<ClipboardList size={17} />}
                label="Goal"
                done={startReadiness.hasGoal}
                detail={startReadiness.hasGoal ? 'Goal ready' : 'Choose a template or write one'}
              />
              <StartReadinessItem
                icon={<ShieldCheck size={17} />}
                label="Safety"
                done={startReadiness.canStart}
                detail={startReadiness.canStart ? 'Ready to start' : 'Waiting for required info'}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 py-4 border-y border-zinc-800/60">
            <SessionStartStep number="1" label="Project ready" done={startReadiness.hasProject} />
            <div className="h-px w-8 bg-zinc-800 hidden sm:block" />
            <SessionStartStep number="2" label="Goal selected" done={startReadiness.hasGoal} />
            <div className="h-px w-8 bg-zinc-800 hidden sm:block" />
            <SessionStartStep number="3" label="Start session" done={startReadiness.canStart} />
          </div>

          {selectedProject ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
              <div>
                <strong className="text-zinc-200 block text-sm">{selectedProject.name}</strong>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Zero will use this local project as the runtime workspace.
                </p>
                <code className="text-zinc-500 text-[10px] mt-1 block font-mono">
                  {selectedProject.rootPath}
                </code>
              </div>
              <div className="flex gap-2">
                <Badge tone="green">ready</Badge>
                <Badge tone="blue">{selectedProject.workingMode}</Badge>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div>
                <strong className="text-yellow-500 block text-sm">No project selected</strong>
                <p className="text-yellow-600/70 text-xs mt-0.5">
                  Go to Projects and select or scan a project first.
                </p>
              </div>
              <Badge tone="yellow">missing</Badge>
            </div>
          )}

          <details className="group [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
              Show project fields
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-400">Project root</span>
                <input
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
                  value={projectRoot}
                  readOnly={selectedProject !== null}
                  onChange={(event) => setProjectRoot(event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-400">Project name</span>
                <input
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
                  value={projectName}
                  readOnly={selectedProject !== null}
                  onChange={(event) => setProjectName(event.target.value)}
                />
              </label>
            </div>
          </details>

          <section className="flex flex-col gap-4 mt-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1 block">
                Step 2
              </span>
              <h2 className="text-lg font-medium text-zinc-100">Choose what Zero should do</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Pick a safe template or write your own goal. You can edit the goal before starting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {sessionGoalTemplates.map((template) => (
                <button
                  key={template.label}
                  onClick={() => selectGoalTemplate(template.goal)}
                  className={`flex flex-col text-left p-4 rounded-lg border transition-all ${
                    goal === template.goal
                      ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/40'
                      : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <strong
                    className={`text-sm ${goal === template.goal ? 'text-indigo-300' : 'text-zinc-200'}`}
                  >
                    {template.label}
                  </strong>
                  <span className="text-xs text-zinc-500 mt-1 line-clamp-3 leading-relaxed">
                    {template.goal}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <label id="session-goal-field" className="flex flex-col gap-2 mt-2">
            <span className="text-sm font-medium text-zinc-300">Session goal</span>
            <textarea
              rows={5}
              value={goal}
              placeholder="Example: analyze the project and propose one small safe improvement without touching database..."
              onChange={(event) => setGoal(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors resize-y shadow-inner"
            />
          </label>

          <article className="flex items-start gap-3 p-4 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
            <Route size={18} className="text-indigo-400 mt-0.5" />
            <div>
              <strong className="text-sm text-zinc-200 block">
                Recommended first action after start
              </strong>
              <p className="text-xs text-zinc-400 mt-1">
                Start the session and Zero will automatically prepare the workflow: stack, routes,
                frontend/backend links, safe scripts, tasks and questions.
              </p>
            </div>
          </article>

          <button
            className="mt-2 w-full sm:w-auto self-end rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
            disabled={!startReadiness.canStart || sessionStartLoading || workflowLoading}
            onClick={() => void createSession()}
          >
            {sessionStartLoading || workflowLoading
              ? 'Starting and preparing workflow...'
              : 'Start guided session'}
          </button>
        </article>
      ) : null}

      <div className="mt-2 sticky top-16 z-30 bg-zinc-950/80 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <SessionWorkspaceTabs
          activeTab={activeWorkspaceTab}
          pendingApprovals={approvalCenter?.pendingCount ?? 0}
          artifactCount={artifactIndex?.artifacts.length ?? 0}
          questionCount={questions.length}
          taskCount={tasks.length}
          onChange={setActiveWorkspaceTab}
        />
      </div>

      {session && !workflowPrepared ? (
        <article className="flex flex-col md:flex-row gap-6 md:items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Route size={16} className={workflowLoading ? 'text-yellow-400' : 'text-blue-400'} />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Preparing workflow
              </span>
              <Badge tone={workflowLoading ? 'yellow' : 'blue'}>
                {workflowLoading ? 'running' : 'ready'}
              </Badge>
            </div>
            <h2 className="text-lg font-medium text-zinc-100">
              {workflowLoading ? 'Preparing project intelligence' : 'Prepare this project workflow'}
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Zero is preparing the project context needed for the guided flow: stack, safe scripts,
              API routes, frontend/backend links, tasks and questions.
            </p>
          </div>

          <button
            className="whitespace-nowrap rounded-lg bg-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-50 transition-colors"
            disabled={workflowLoading}
            onClick={() => void prepareWorkflow()}
          >
            {workflowLoading ? 'Preparing workflow...' : 'Prepare workflow'}
          </button>
        </article>
      ) : null}

      {/* Tabs Content Sections */}
      <section className="flex flex-col gap-6 w-full">
        {activeWorkspaceTab === 'overview' ? (
          <div className="flex flex-col gap-6">
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <OverviewMetricCard
                label="Session"
                value={session ? 'active' : 'not started'}
                tone={session ? 'green' : 'slate'}
                detail={
                  session
                    ? 'Runtime boundary is active for the selected project.'
                    : 'Start a guided session to enable workflow actions.'
                }
              />

              <OverviewMetricCard
                label="Questions"
                value={
                  pendingHighPriorityQuestionCount > 0
                    ? `${pendingHighPriorityQuestionCount} pending`
                    : 'clear'
                }
                tone={pendingHighPriorityQuestionCount > 0 ? 'yellow' : 'green'}
                detail={
                  pendingHighPriorityQuestionCount > 0
                    ? 'Important questions should be answered before planning.'
                    : 'No high-priority questions are blocking the plan.'
                }
              />

              <OverviewMetricCard
                label="Plan"
                value={
                  runtimePlan?.validation.valid === true
                    ? runtimePlan.plan.mode === 'read_only'
                      ? 'read-only'
                      : 'patch-ready'
                    : runtimePlan?.validation.valid === false
                      ? 'blocked'
                      : 'not created'
                }
                tone={
                  runtimePlan?.validation.valid === true
                    ? 'green'
                    : runtimePlan?.validation.valid === false
                      ? 'red'
                      : 'slate'
                }
                detail="The plan controls whether Zero is analyzing only or preparing a patch workflow."
              />

              <OverviewMetricCard
                label="Approvals"
                value={`${approvalCenter?.pendingCount ?? 0}`}
                tone={(approvalCenter?.pendingCount ?? 0) > 0 ? 'yellow' : 'slate'}
                detail={
                  (approvalCenter?.pendingCount ?? 0) > 0
                    ? 'Approval Center needs attention.'
                    : 'No approval is currently competing for attention.'
                }
              />
            </section>

            <GuidedWorkflowPanel
              session={session}
              runtimePlan={runtimePlan}
              patchProposal={patchProposal}
              patchDiff={patchDiff}
              snapshot={snapshot}
              applyResult={patchApplyResult}
              rollbackResult={patchRollbackResult}
              reportExport={reportExport}
              runtimeWorkflow={runtimeWorkflow}
              runtimeWorkflowLoading={runtimeWorkflowLoading}
              workspaceMode={selectedProject?.workingMode ?? null}
              patchSandboxResult={patchSandboxResult}
              patchRecoveryResult={patchRecoveryResult}
              onPrepareWorkflow={() => void prepareWorkflow()}
              pendingQuestionCount={pendingQuestionCount}
              pendingHighPriorityQuestionCount={pendingHighPriorityQuestionCount}
              onReviewQuestions={() => moveToQuestions()}
              onGeneratePlan={() => void generatePlan(false)}
              onGenerateProviderPlan={() => void generatePlan(true)}
              onGeneratePatchProposal={() => void generatePatch()}
              onGeneratePatchDiff={() => void generateDiff()}
              onVerifySandbox={() => void verifySandbox()}
              onPrepareRecovery={() => void prepareRecovery()}
              onGenerateRecoveryProposal={() => void generateRecoveryProposal()}
              onDryRunApply={() => void dryRunApplyPatch()}
              onCreateSnapshot={() => {
                const targetFiles = selectedPatchFiles() ??
                  patchProposal?.proposal.files.map((file) => file.path) ??
                  runtimePlan?.plan.scope.candidateFiles.map((file) => file.path) ?? [
                    'package.json',
                  ];

                void createSessionSnapshot(targetFiles);
              }}
              onExportReport={() => void exportReport()}
            />

            {questions.length > 0 ? (
              <RuntimeQuestionsPanel
                questions={questions}
                loading={questionsLoading}
                onRefresh={() => void refreshQuestions()}
                onAnswer={(questionId, answer) => void answerQuestion(questionId, answer)}
              />
            ) : null}

            <SecondaryToolsDetails timelineCount={session?.timeline.length ?? 0}>
              <ChatPanel
                session={session}
                command={command}
                onCommandChange={setCommand}
                onSendCommand={() => void routeCommand()}
              />

              <SessionTimelinePanel session={session} />

              <SessionResumePanel
                sessions={savedSessions}
                currentSession={session}
                loading={savedSessionsLoading}
                onRefresh={() => void refreshSavedSessions()}
                onResume={(savedSession) => void resumeSession(savedSession)}
              />

              <SuggestionPanel
                suggestions={suggestions}
                loading={suggestionsLoading}
                onRefresh={() => void refreshSuggestions()}
                onRunSuggestion={(input) => void routeCommand(input)}
              />
            </SecondaryToolsDetails>
            {session && resumedSessionId === session.id ? (
              <ResumedSessionNotice
                session={session}
                artifactCount={
                  artifactIndex?.artifacts.filter((artifact) => artifact.sessionId === session.id)
                    .length ?? 0
                }
                onOpenArtifacts={() => moveToWorkspaceTab('artifacts')}
                onRefreshArtifacts={() => void refreshArtifactStore(session.id)}
              />
            ) : null}
          </div>
        ) : null}

        {activeWorkspaceTab === 'plan' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PlanPanel
              session={session}
              runtimePlan={runtimePlan}
              loading={runtimePlanLoading}
              onGeneratePlan={() => void generatePlan(false)}
              onGenerateProviderPlan={() => void generatePlan(true)}
              onApprovePlan={() => void approvePlanAction()}
              onRequestPlanChanges={() => void requestPlanChangesAction()}
              onAddPlanRestriction={() => void addPlanRestrictionAction()}
              onViewPlanContext={viewPlanContextAction}
              onCancelPlan={() => void cancelPlanAction()}
            />
            <ApprovalPanel
              center={approvalCenter}
              loading={approvalCenterLoading}
              onDecision={(input) => void handleApprovalDecision(input)}
            />
          </div>
        ) : null}

        {activeWorkspaceTab === 'patch' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <PatchPanel
              session={session}
              runtimePlan={runtimePlan}
              patchProposal={patchProposal}
              patchDiff={patchDiff}
              snapshot={snapshot}
              applyResult={patchApplyResult}
              rollbackResult={patchRollbackResult}
              loading={patchProposalLoading}
              diffLoading={patchDiffLoading}
              applyLoading={patchApplyLoading}
              rollbackLoading={patchRollbackLoading}
              onGeneratePatchProposal={() => void generatePatch()}
              onGeneratePatchDiff={() => void generateDiff()}
              sandboxResult={patchSandboxResult}
              sandboxLoading={patchSandboxLoading}
              recoveryResult={patchRecoveryResult}
              recoveryLoading={patchRecoveryLoading}
              onPrepareRecovery={() => void prepareRecovery()}
              recoveryProposalLoading={patchRecoveryProposalLoading}
              onGenerateRecoveryProposal={() => void generateRecoveryProposal()}
              onVerifySandbox={() => void verifySandbox()}
              onDryRunApply={() => void dryRunApplyPatch()}
              onApplyPatch={(input) => void applyPatch(input)}
              onDryRunRollback={() => void dryRunRollbackPatch()}
              onRollbackPatch={(input) => void rollbackPatch(input)}
              onCommand={(input) => void routeCommand(input)}
            />

            <div className="flex flex-col gap-6">
              <SnapshotPanel
                session={session}
                snapshot={snapshot}
                loading={snapshotLoading}
                onCreateSnapshot={(targetFiles) => void createSessionSnapshot(targetFiles)}
              />
              <ApprovalPanel
                center={approvalCenter}
                loading={approvalCenterLoading}
                onDecision={(input) => void handleApprovalDecision(input)}
              />
            </div>
          </div>
        ) : null}

        {activeWorkspaceTab === 'context' ? (
          <div id="context-tab-top" className="flex flex-col gap-6 scroll-mt-32">
            <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Runtime context
                  </span>
                  <h2 className="mt-2 text-2xl font-semibold text-zinc-100 tracking-tight">
                    {isReadOnlyPlan()
                      ? 'Context for read-only analysis'
                      : 'Context for runtime planning'}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm text-zinc-400 leading-relaxed">
                    {isReadOnlyPlan()
                      ? 'These files and relationships are used for analysis and recommendations only. Zero should not treat them as patch candidates in this session.'
                      : 'These files and relationships explain why Zero selected context before plan, patch, verification or report steps.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge tone={workflowPrepared ? 'green' : 'yellow'}>
                    {workflowPrepared ? 'prepared' : 'needs prepare'}
                  </Badge>
                  <Badge tone={isReadOnlyPlan() ? 'green' : 'blue'}>
                    {isReadOnlyPlan() ? 'read-only' : 'runtime context'}
                  </Badge>
                  <Badge tone="blue">{collectKnownFiles().length} linked files</Badge>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ContextPanel session={session} readOnly={isReadOnlyPlan()} />

              <ProjectIntelligencePanel
                stack={stackIntelligence}
                routes={apiRoutes}
                links={frontendBackendLinks}
                loading={intelligenceLoading}
                workflowLoading={workflowLoading}
                onAnalyze={() => void analyzeProject()}
                onPrepareWorkflow={() => void prepareWorkflow()}
              />
            </section>

            <IntelligentContextPanel
              routes={apiRoutes}
              links={frontendBackendLinks}
              readOnly={isReadOnlyPlan()}
            />

            <ContextGraphPanel
              graph={contextGraph}
              loading={contextGraphLoading}
              disabled={!session}
              defaultTargetFilePath={collectKnownFiles()[0] ?? ''}
              onGenerate={(input) => void analyzeContextGraph(input)}
            />
          </div>
        ) : null}

        {activeWorkspaceTab === 'verify' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <VerifyPanel
              commands={verifyCommands}
              scripts={packageScripts}
              lastRun={lastVerifyRun}
              loading={verifyLoading}
              onRefresh={() => void refreshVerify()}
              onRun={(verifyCommand) => void runVerify(verifyCommand)}
            />

            <TaskQueuePanel
              tasks={tasks}
              progress={taskProgress}
              loading={tasksLoading}
              onRefresh={() => void refreshTasks()}
              onCreateDefaultTasks={() => void createDefaultTasks()}
              onTransition={(taskId, status) => void transitionTask(taskId, status)}
            />
          </div>
        ) : null}

        {activeWorkspaceTab === 'memory' ? (
          <SessionMemoryPanel
            memory={sessionMemory}
            loading={sessionMemoryLoading}
            disabled={!session}
            onRefresh={() => void refreshSessionMemory()}
            onAddDecision={(input) => void addMemoryDecision(input)}
          />
        ) : null}

        {activeWorkspaceTab === 'artifacts' ? (
          <div className="flex flex-col gap-6">
            {/* Demo Completion Card ya refactorizada con Tailwind */}
            <article className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
              <div className="mb-5 border-b border-zinc-800/60 pb-4">
                <h2 className="text-lg font-medium text-zinc-100">MVP demo completion</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  This is the final evidence area. Export the report and inspect artifacts to verify
                  what Zero proposed, blocked, tested and applied.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <DemoCompletionItem
                  done={runtimePlan?.validation.valid === true}
                  label="Plan valid"
                />
                <DemoCompletionItem
                  done={patchProposal?.validation.valid === true}
                  label="Patch proposal valid"
                />
                <DemoCompletionItem
                  done={patchDiff?.diff.safeToPreview === true}
                  label="Diff ready"
                />
                <DemoCompletionItem
                  done={patchSandboxResult?.status === 'passed'}
                  label="Sandbox passed"
                />
                <DemoCompletionItem
                  done={patchApplyResult !== null}
                  label="Apply/dry-run executed"
                />
                <DemoCompletionItem done={reportExport !== null} label="Report exported" />
              </div>
            </article>

            <ReportExportPanel
              result={reportExport}
              loading={reportLoading}
              disabled={!session}
              onExport={() => void exportReport()}
            />

            <RuntimeArtifactStorePanel
              index={artifactIndex}
              selectedArtifact={selectedArtifact}
              selectedContent={selectedArtifactContent}
              loading={artifactLoading}
              currentSessionId={session?.id ?? null}
              onRefresh={() => void refreshArtifactStore(session?.id)}
              onSelect={(artifact) => void selectArtifact(artifact)}
            />
          </div>
        ) : null}

        {activeWorkspaceTab === 'audit' ? (
          <AuditTimeline session={session} runtimeEvents={runtimeEvents} />
        ) : null}
      </section>
    </section>
  );
}
