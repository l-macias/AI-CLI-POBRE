import { useState } from 'react';
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
import { SessionTimelinePanel } from '../components/session/SessionTimelinePanel';
import { SuggestionPanel } from '../components/suggestions/SuggestionPanel';
import { TaskQueuePanel } from '../components/tasks/TaskQueuePanel';
import { VerifyPanel } from '../components/verify/VerifyPanel';
import { SnapshotPanel } from '../components/snapshots/SnapshotPanel';
import { IntelligentContextPanel } from '../components/context/IntelligentContextPanel';
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
} from '../types/runtime';

interface SessionPageProps {
  runtimeEvents?: RuntimeEvent[];
}

export function SessionPage({ runtimeEvents = [] }: SessionPageProps) {
  const [projectRoot, setProjectRoot] = useState('');
  const [projectName, setProjectName] = useState('');
  const [goal, setGoal] = useState('');
  const [command, setCommand] = useState('/plan');
  const [session, setSession] = useState<InteractiveSessionState | null>(null);

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
  const [workflowLoading, setWorkflowLoading] = useState(false);

  const [runtimePlan, setRuntimePlan] = useState<RuntimePlanGenerateResult | null>(null);
  const [runtimePlanLoading, setRuntimePlanLoading] = useState(false);

  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsViewModel | null>(null);

  const [patchProposal, setPatchProposal] = useState<RuntimePatchProposalGenerateResult | null>(
    null,
  );
  const [patchProposalLoading, setPatchProposalLoading] = useState(false);

  const [reportExport, setReportExport] = useState<ReportExportResult | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [snapshot, setSnapshot] = useState<CreateSnapshotResult | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  async function createSession() {
    const created = await startSession({
      projectRoot,
      projectName,
      goal,
    });

    setSession(created);

    void refreshSuggestions(created);
    void refreshQuestions(created);
    void refreshTasks(created);
    void refreshVerify(created);
    void refreshRuntimeSettings();
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

    void refreshSuggestions(updated);
    void refreshQuestions(updated);
    void refreshTasks(updated);
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
      const result = await generatePatchProposal({
        sessionId: session.id,
        planId: runtimePlan.plan.id,
        summary: runtimePlan.plan.objective,
        riskLevel: runtimePlan.plan.riskLevel,
        candidateFiles: runtimePlan.plan.scope.candidateFiles.map((file) => ({
          path: file.path,
          existsKnown: file.existsKnown,
          reason: file.reason,
        })),
        verifyCommands: runtimePlan.plan.verifyCommands,
      });

      setPatchProposal(result);

      const refreshed = await sendSessionCommand({
        sessionId: session.id,
        command: 'Patch proposal generado y registrado. No se aplicaron archivos.',
      });

      setSession(refreshed);
    } finally {
      setPatchProposalLoading(false);
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

  return (
    <section className="session-page">
      <RuntimeStatusBar session={session} />

      {!session ? (
        <article className="panel session-start-panel">
          <div>
            <h1>Start interactive session</h1>
            <p className="muted">
              Create a persistent runtime session for the selected local project.
            </p>
          </div>

          <div className="session-start-grid">
            <label>
              Project root
              <input value={projectRoot} onChange={(event) => setProjectRoot(event.target.value)} />
            </label>

            <label>
              Project name
              <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
            </label>
          </div>

          <label>
            Goal
            <textarea rows={4} value={goal} onChange={(event) => setGoal(event.target.value)} />
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

      <section className="session-workspace-grid">
        <ChatPanel
          session={session}
          command={command}
          onCommandChange={setCommand}
          onSendCommand={() => void routeCommand()}
        />

        <SessionTimelinePanel session={session} />
      </section>

      <section className="session-panels-grid">
        <ContextPanel session={session} />
        <PlanPanel
          session={session}
          runtimePlan={runtimePlan}
          loading={runtimePlanLoading}
          onGeneratePlan={() => void generatePlan(false)}
          onGenerateProviderPlan={() => void generatePlan(true)}
          onCommand={(input) => void routeCommand(input)}
        />
        <PatchPanel
          session={session}
          runtimePlan={runtimePlan}
          patchProposal={patchProposal}
          loading={patchProposalLoading}
          onGeneratePatchProposal={() => void generatePatch()}
          onCommand={(input) => void routeCommand(input)}
        />
        <IntelligentContextPanel routes={apiRoutes} links={frontendBackendLinks} />
        <SnapshotPanel
          session={session}
          snapshot={snapshot}
          loading={snapshotLoading}
          onCreateSnapshot={(targetFiles) => void createSessionSnapshot(targetFiles)}
        />
        <ApprovalPanel
          session={session}
          snapshotAvailable={snapshot !== null}
          onApproveIntent={() => void routeCommand('/apply')}
          onRejectIntent={() => void routeCommand('/reject')}
          onCommand={(input) => void routeCommand(input)}
        />
      </section>

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

      <TaskQueuePanel
        tasks={tasks}
        progress={taskProgress}
        loading={tasksLoading}
        onRefresh={() => void refreshTasks()}
        onCreateDefaultTasks={() => void createDefaultTasks()}
        onTransition={(taskId, status) => void transitionTask(taskId, status)}
      />

      <ProjectIntelligencePanel
        stack={stackIntelligence}
        routes={apiRoutes}
        links={frontendBackendLinks}
        loading={intelligenceLoading}
        workflowLoading={workflowLoading}
        onAnalyze={() => void analyzeProject()}
        onPrepareWorkflow={() => void prepareWorkflow()}
      />

      <VerifyPanel
        commands={verifyCommands}
        scripts={packageScripts}
        lastRun={lastVerifyRun}
        loading={verifyLoading}
        onRefresh={() => void refreshVerify()}
        onRun={(verifyCommand) => void runVerify(verifyCommand)}
      />

      <ReportExportPanel
        result={reportExport}
        loading={reportLoading}
        disabled={!session}
        onExport={() => void exportReport()}
      />

      <AuditTimeline session={session} runtimeEvents={runtimeEvents} />
    </section>
  );
}
