import { useEffect, useState } from 'react';
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
    setPatchApplyResult(null);
    setPatchRollbackResult(null);
    setReportExport(null);
    setRuntimeWorkflow(null);
    setApprovalCenter(null);
    setApprovedPatchFilePaths(null);
    setApprovedPatchDecision(null);
    setSessionMemory(null);
    setSnapshot(null);
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

  async function createSession() {
    const created = await startSession({
      projectRoot: projectRoot || selectedProject?.rootPath || '',
      projectName: projectName || selectedProject?.name || '',
      goal,
    });

    setSession(created);
    onSessionChange(created);
    setActiveWorkspaceTab('overview');
    void refreshSuggestions(created);
    void refreshQuestions(created);
    void refreshTasks(created);
    void refreshVerify(created);
    void refreshRuntimeSettings();
    void refreshSessionMemory(created);
    void refreshArtifactStore();
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
    void refreshArtifactStore();
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
    } finally {
      setVerifyLoading(false);
    }
  }

  async function refreshArtifactStore() {
    setArtifactLoading(true);

    try {
      const result = await listRuntimeArtifacts();

      setArtifactIndex(result.artifactIndex);
    } finally {
      setArtifactLoading(false);
    }
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

  async function resumeSession(nextSession: InteractiveSessionState) {
    setSession(nextSession);
    setProjectRoot(nextSession.projectRoot);
    setProjectName(nextSession.projectName);
    setGoal(nextSession.goal.current);
    onSessionChange(nextSession);
    setActiveWorkspaceTab('overview');

    void refreshSuggestions(nextSession);
    void refreshQuestions(nextSession);
    void refreshTasks(nextSession);
    void refreshVerify(nextSession);
    void refreshRuntimeSettings();
    void refreshSessionMemory(nextSession);
    void refreshArtifactStore();
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
    } finally {
      setReportLoading(false);
    }
  }

  async function prepareWorkflow() {
    if (!session) {
      return;
    }

    setWorkflowLoading(true);

    try {
      const workflow = await prepareRuntimeWorkflow({
        sessionId: session.id,
        workspaceMode: 'local_snapshot',
        createDefaultTasks: true,
      });

      setTasks(workflow.tasks.tasks);
      setTaskProgress(workflow.taskProgress);

      setStackIntelligence(workflow.stack);
      setApiRoutes(workflow.apiRoutes);
      setFrontendBackendLinks(workflow.frontendBackend);

      setQuestions(workflow.questions.questions);
      setSuggestions(workflow.suggestions);

      setPackageScripts(workflow.verifyScripts);
    } finally {
      setWorkflowLoading(false);
    }
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

  function buildWorkflowArtifactState(): RuntimeWorkflowArtifactState {
    const workflowPrepared = Boolean(
      stackIntelligence ||
      apiRoutes ||
      frontendBackendLinks ||
      tasks.length > 0 ||
      packageScripts ||
      questions.length > 0 ||
      suggestions.length > 0,
    );

    return {
      sessionStarted: session !== null,
      workflowPrepared,
      planValid: runtimePlan?.validation.valid === true,
      planRejected: runtimePlan?.validation.valid === false,
      patchProposalValid: patchProposal?.validation.valid === true,
      patchProposalRejected: patchProposal?.validation.valid === false,
      diffReady: patchDiff?.diff.safeToPreview === true,
      diffBlocked: patchDiff ? !patchDiff.diff.safeToPreview : false,
      snapshotAvailable: snapshot !== null,
      dryRunCompleted:
        patchApplyResult?.status === 'dry_run' || patchApplyResult?.status === 'applied',
      applyApplied: patchApplyResult?.status === 'applied',
      applyBlocked: patchApplyResult?.status === 'blocked',
      applyFailed: patchApplyResult?.status === 'failed',
      rollbackDryRunCompleted:
        patchRollbackResult?.status === 'dry_run' || patchRollbackResult?.status === 'rolled_back',
      rollbackCompleted: patchRollbackResult?.status === 'rolled_back',
      rollbackBlocked: patchRollbackResult?.status === 'blocked',
      rollbackFailed: patchRollbackResult?.status === 'failed',
      verifyCompleted:
        (lastVerifyRun?.status === 'executed' && lastVerifyRun.exitCode === 0) ||
        patchSandboxResult?.status === 'passed',
      reportExported: reportExport !== null,
      riskLevel: patchProposal?.proposal.riskLevel ?? runtimePlan?.plan.riskLevel ?? null,
    };
  }

  function buildApprovalArtifactState(): ApprovalCenterArtifactState | null {
    if (!session) {
      return null;
    }

    return {
      sessionId: session.id,
      projectRoot: session.projectRoot,
      plan: runtimePlan?.plan ?? null,
      proposal: patchProposal?.proposal ?? null,
      diff: patchDiff?.diff ?? null,
      applyResult: patchApplyResult,
      lastVerifyRun,
      snapshotAvailable: snapshot !== null,
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
      return;
    }

    if (input.action === 'ask_revision') {
      await routeCommand(`/revise ${input.reason ?? 'Approval requested revision.'}`);
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

      return;
    }

    if (request?.kind === 'rollback') {
      await rollbackPatch({
        confirmedText: 'ROLLBACK',
      });
      return;
    }

    if (request?.kind === 'patch') {
      const nextSelectedFiles =
        input.action === 'approve_selected_files'
          ? result.decision.selectedFilePaths
          : request.filePaths;

      setApprovedPatchFilePaths(nextSelectedFiles);
      setApprovedPatchDecision(result.decision);

      await generateDiff(nextSelectedFiles);
      return;
    }

    await routeCommand(`Approval accepted: ${request?.title ?? input.requestId}`);
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
        currentAttempt: 1,
        maxAttempts: 2,
      });

      setPatchRecoveryResult(result.recovery);

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
    snapshot,
    patchApplyResult,
    patchRollbackResult,
    lastVerifyRun,
    reportExport,
  ]);

  return (
    <section className="session-page">
      <RuntimeStatusBar session={session} />

      <div className="session-page-toolbar">
        <div>
          <strong>
            {session ? session.projectName : (selectedProject?.name ?? 'No project selected')}
          </strong>
          <p>
            {session
              ? session.goal.current
              : selectedProject
                ? selectedProject.rootPath
                : 'Select a project before starting a session.'}
          </p>
        </div>

        <div className="session-page-toolbar-actions">
          <button className="secondary-button" onClick={() => void refreshSavedSessions()}>
            Refresh sessions
          </button>

          <button className="danger-button" onClick={startNewSessionView}>
            New session
          </button>
        </div>
      </div>

      {!session ? (
        <article id="session-start-panel" className="panel session-start-panel">
          <div>
            <h1>Start interactive session</h1>
            <p className="muted">
              Create a persistent runtime session for the selected local project.
            </p>
          </div>

          {selectedProject ? (
            <div className="selected-project-banner">
              <div>
                <strong>Selected project</strong>
                <p>{selectedProject.name}</p>
                <small>{selectedProject.rootPath}</small>
              </div>

              <Badge tone="green">ready</Badge>
            </div>
          ) : (
            <div className="selected-project-banner warning">
              <div>
                <strong>No project selected</strong>
                <p>Go to Projects and select or scan a project first.</p>
              </div>

              <Badge tone="yellow">missing</Badge>
            </div>
          )}

          <div className="session-start-grid">
            <label>
              Project root
              <input
                value={projectRoot}
                readOnly={selectedProject !== null}
                onChange={(event) => setProjectRoot(event.target.value)}
              />
            </label>

            <label>
              Project name
              <input
                value={projectName}
                readOnly={selectedProject !== null}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </label>
          </div>

          <label>
            Goal
            <textarea
              rows={4}
              value={goal}
              placeholder="Ej: Analizar el proyecto y proponer una mejora pequeña y segura sin tocar base de datos, .env ni archivos protegidos."
              onChange={(event) => setGoal(event.target.value)}
            />
          </label>

          <button
            disabled={
              projectRoot.trim().length === 0 ||
              projectName.trim().length === 0 ||
              goal.trim().length === 0
            }
            onClick={() => void createSession()}
          >
            Start session
          </button>
        </article>
      ) : null}

      <SessionWorkspaceTabs
        activeTab={activeWorkspaceTab}
        pendingApprovals={approvalCenter?.pendingCount ?? 0}
        artifactCount={artifactIndex?.artifacts.length ?? 0}
        questionCount={questions.length}
        taskCount={tasks.length}
        onChange={setActiveWorkspaceTab}
      />

      <section className="session-tab-content">
        {activeWorkspaceTab === 'overview' ? (
          <div className="session-tab-grid">
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
              patchSandboxResult={patchSandboxResult}
              onPrepareWorkflow={() => void prepareWorkflow()}
              onGeneratePlan={() => void generatePlan(false)}
              onGenerateProviderPlan={() => void generatePlan(true)}
              onGeneratePatchProposal={() => void generatePatch()}
              onGeneratePatchDiff={() => void generateDiff()}
              onVerifySandbox={() => void verifySandbox()}
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

            <section className="session-workspace-grid">
              <ChatPanel
                session={session}
                command={command}
                onCommandChange={setCommand}
                onSendCommand={() => void routeCommand()}
              />

              <SessionTimelinePanel session={session} />
            </section>

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

            <RuntimeQuestionsPanel
              questions={questions}
              loading={questionsLoading}
              onRefresh={() => void refreshQuestions()}
              onAnswer={(questionId, answer) => void answerQuestion(questionId, answer)}
            />
          </div>
        ) : null}

        {activeWorkspaceTab === 'plan' ? (
          <div className="session-tab-grid">
            <PlanPanel
              session={session}
              runtimePlan={runtimePlan}
              loading={runtimePlanLoading}
              onGeneratePlan={() => void generatePlan(false)}
              onGenerateProviderPlan={() => void generatePlan(true)}
              onCommand={(input) => void routeCommand(input)}
            />

            <ApprovalPanel
              center={approvalCenter}
              loading={approvalCenterLoading}
              onDecision={(input) => void handleApprovalDecision(input)}
            />
          </div>
        ) : null}

        {activeWorkspaceTab === 'patch' ? (
          <div className="session-tab-grid">
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
              onVerifySandbox={() => void verifySandbox()}
              onDryRunApply={() => void dryRunApplyPatch()}
              onApplyPatch={(input) => void applyPatch(input)}
              onDryRunRollback={() => void dryRunRollbackPatch()}
              onRollbackPatch={(input) => void rollbackPatch(input)}
              onCommand={(input) => void routeCommand(input)}
            />

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
        ) : null}

        {activeWorkspaceTab === 'context' ? (
          <div className="session-tab-grid">
            <ContextPanel session={session} />

            <ProjectIntelligencePanel
              stack={stackIntelligence}
              routes={apiRoutes}
              links={frontendBackendLinks}
              loading={intelligenceLoading}
              workflowLoading={workflowLoading}
              onAnalyze={() => void analyzeProject()}
              onPrepareWorkflow={() => void prepareWorkflow()}
            />

            <IntelligentContextPanel routes={apiRoutes} links={frontendBackendLinks} />

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
          <div className="session-tab-grid">
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
          <div className="session-tab-grid">
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
              onRefresh={() => void refreshArtifactStore()}
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
