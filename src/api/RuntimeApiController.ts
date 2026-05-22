import type { InteractiveSession } from '../interactive/InteractiveSession.js';
import type { InteractiveCommandRouter } from '../interactive/InteractiveCommandRouter.js';
import { ProjectRegistry } from '../projects/ProjectRegistry.js';
import { ProjectScanner } from '../projects/ProjectScanner.js';
import { RuntimeEventBus } from '../server/RuntimeEventBus.js';
import { LocalSnapshotManager } from '../workspace/LocalSnapshotManager.js';
import { SnapshotDiffService } from '../workspace/SnapshotDiffService.js';
import { SnapshotRestoreService } from '../workspace/SnapshotRestoreService.js';
import { WorkspaceModeResolver } from '../workspace/WorkspaceModeResolver.js';
import type { JsonObject, JsonValue } from '../types/SharedTypes.js';
import { RuntimeApiResponse } from './RuntimeApiResponse.js';
import type { RuntimeApiRouteResult } from './RuntimeApiTypes.js';
import { LocalDirectoryBrowser } from '../server/LocalDirectoryBrowser.js';
import { SuggestionEngine } from '../suggestions/SuggestionEngine.js';
import { RuntimeQuestionEngine } from '../interactive/RuntimeQuestionEngine.js';
import { QuestionAnswerStore } from '../interactive/QuestionAnswerStore.js';
import { SessionTaskQueue } from '../tasks/SessionTaskQueue.js';
import { VerifyRunner } from '../verify/VerifyRunner.js';
import { VerifyCommandRegistry } from '../verify/VerifyCommandRegistry.js';
import { PackageScriptScanner } from '../verify/PackageScriptScanner.js';
import { SessionReportBuilder } from '../reports/SessionReportBuilder.js';
import { ReportStorage } from '../reports/ReportStorage.js';
import { ProjectStackDetector } from '../languages/ProjectStackDetector.js';
import { ExpressRouteScanner } from '../intelligence/api/ExpressRouteScanner.js';
import { FrontendBackendLinker } from '../intelligence/frontend/FrontendBackendLinker.js';
import { RuntimeSettingsStore } from '../settings/RuntimeSettingsStore.js';
import { RuntimeWorkflowOrchestrator } from '../workflow/RuntimeWorkflowOrchestrator.js';
import { VerifyRunStore } from '../verify/VerifyRunStore.js';
import { RuntimeQuestionDecisionMapper } from '../interactive/RuntimeQuestionDecisionMapper.js';
import { SessionDecisionStore } from '../interactive/SessionDecisionStore.js';
import { ProviderStatusService } from '../providers/ProviderStatusService.js';

export interface RuntimeApiControllerOptions {
  session: InteractiveSession;
  commandRouter: InteractiveCommandRouter;
  projectRegistry?: ProjectRegistry | undefined;
  projectScanner?: ProjectScanner | undefined;
  workspaceModeResolver?: WorkspaceModeResolver | undefined;
  snapshotManager?: LocalSnapshotManager | undefined;
  snapshotDiffService?: SnapshotDiffService | undefined;
  snapshotRestoreService?: SnapshotRestoreService | undefined;
  eventBus?: RuntimeEventBus | undefined;
  response?: RuntimeApiResponse | undefined;
  directoryBrowser?: LocalDirectoryBrowser | undefined;
  suggestionEngine?: SuggestionEngine | undefined;
  questionEngine?: RuntimeQuestionEngine | undefined;
  questionAnswerStore?: QuestionAnswerStore | undefined;
  taskQueue?: SessionTaskQueue | undefined;
  verifyRunner?: VerifyRunner | undefined;
  verifyCommandRegistry?: VerifyCommandRegistry | undefined;
  packageScriptScanner?: PackageScriptScanner | undefined;
  sessionReportBuilder?: SessionReportBuilder | undefined;
  reportStorage?: ReportStorage | undefined;
  projectStackDetector?: ProjectStackDetector | undefined;
  expressRouteScanner?: ExpressRouteScanner | undefined;
  frontendBackendLinker?: FrontendBackendLinker | undefined;
  runtimeSettingsStore?: RuntimeSettingsStore | undefined;
  workflowOrchestrator?: RuntimeWorkflowOrchestrator | undefined;
  verifyRunStore?: VerifyRunStore | undefined;
  questionDecisionMapper?: RuntimeQuestionDecisionMapper | undefined;
  sessionDecisionStore?: SessionDecisionStore | undefined;
  providerStatusService?: ProviderStatusService | undefined;
}

export class RuntimeApiController {
  private readonly session: InteractiveSession;
  private readonly commandRouter: InteractiveCommandRouter;
  private readonly projectRegistry: ProjectRegistry;
  private readonly projectScanner: ProjectScanner;
  private readonly workspaceModeResolver: WorkspaceModeResolver;
  private readonly snapshotManager: LocalSnapshotManager;
  private readonly snapshotDiffService: SnapshotDiffService;
  private readonly snapshotRestoreService: SnapshotRestoreService;
  private readonly eventBus: RuntimeEventBus;
  private readonly response: RuntimeApiResponse;
  private readonly directoryBrowser: LocalDirectoryBrowser;
  private readonly suggestionEngine: SuggestionEngine;
  private readonly questionEngine: RuntimeQuestionEngine;
  private readonly questionAnswerStore: QuestionAnswerStore;
  private readonly taskQueue: SessionTaskQueue;
  private readonly verifyRunner: VerifyRunner;
  private readonly verifyCommandRegistry: VerifyCommandRegistry;
  private readonly packageScriptScanner: PackageScriptScanner;
  private readonly sessionReportBuilder: SessionReportBuilder;
  private readonly reportStorage: ReportStorage;
  private readonly projectStackDetector: ProjectStackDetector;
  private readonly expressRouteScanner: ExpressRouteScanner;
  private readonly frontendBackendLinker: FrontendBackendLinker;
  private readonly runtimeSettingsStore: RuntimeSettingsStore;
  private readonly workflowOrchestrator: RuntimeWorkflowOrchestrator;
  private readonly verifyRunStore: VerifyRunStore;
  private readonly questionDecisionMapper: RuntimeQuestionDecisionMapper;
  private readonly sessionDecisionStore: SessionDecisionStore;
  private readonly providerStatusService: ProviderStatusService;

  public constructor(options: RuntimeApiControllerOptions) {
    this.session = options.session;
    this.commandRouter = options.commandRouter;
    this.projectRegistry = options.projectRegistry ?? new ProjectRegistry();
    this.projectScanner = options.projectScanner ?? new ProjectScanner();
    this.workspaceModeResolver = options.workspaceModeResolver ?? new WorkspaceModeResolver();
    this.snapshotManager = options.snapshotManager ?? new LocalSnapshotManager();
    this.snapshotDiffService = options.snapshotDiffService ?? new SnapshotDiffService();
    this.snapshotRestoreService = options.snapshotRestoreService ?? new SnapshotRestoreService();
    this.eventBus = options.eventBus ?? new RuntimeEventBus();
    this.suggestionEngine = options.suggestionEngine ?? new SuggestionEngine();
    this.directoryBrowser = options.directoryBrowser ?? new LocalDirectoryBrowser();
    this.response = options.response ?? new RuntimeApiResponse();
    this.questionEngine = options.questionEngine ?? new RuntimeQuestionEngine();
    this.questionAnswerStore = options.questionAnswerStore ?? new QuestionAnswerStore();
    this.taskQueue = options.taskQueue ?? new SessionTaskQueue();
    this.verifyRunner = options.verifyRunner ?? new VerifyRunner();
    this.verifyCommandRegistry = options.verifyCommandRegistry ?? new VerifyCommandRegistry();
    this.packageScriptScanner = options.packageScriptScanner ?? new PackageScriptScanner();
    this.sessionReportBuilder = options.sessionReportBuilder ?? new SessionReportBuilder();
    this.reportStorage = options.reportStorage ?? new ReportStorage();
    this.projectStackDetector = options.projectStackDetector ?? new ProjectStackDetector();
    this.expressRouteScanner = options.expressRouteScanner ?? new ExpressRouteScanner();
    this.frontendBackendLinker = options.frontendBackendLinker ?? new FrontendBackendLinker();
    this.runtimeSettingsStore = options.runtimeSettingsStore ?? new RuntimeSettingsStore();
    this.workflowOrchestrator = options.workflowOrchestrator ?? new RuntimeWorkflowOrchestrator();
    this.verifyRunStore = options.verifyRunStore ?? new VerifyRunStore();
    this.questionDecisionMapper =
      options.questionDecisionMapper ?? new RuntimeQuestionDecisionMapper();
    this.sessionDecisionStore = options.sessionDecisionStore ?? new SessionDecisionStore();
    this.providerStatusService = options.providerStatusService ?? new ProviderStatusService();
  }

  public health(): RuntimeApiRouteResult {
    return this.response.ok({
      service: 'zero-runtime-api',
      localOnly: true,
      realtime: 'sse',
    });
  }

  public async startSession(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const projectRoot = this.requiredString(input, 'projectRoot');
    const projectName = this.requiredString(input, 'projectName');
    const goal = this.requiredString(input, 'goal');

    const state = await this.session.start({
      projectRoot,
      projectName,
      goal,
      createdBy: this.optionalString(input, 'createdBy'),
    });

    this.eventBus.publish({
      name: 'session.started',
      sessionId: state.id,
      projectRoot: state.projectRoot,
      message: `Session started for ${state.projectName}.`,
      payload: {
        sessionId: state.id,
        projectName: state.projectName,
        goal: state.goal.current,
      },
    });

    return this.response.created({
      session: state as unknown as JsonObject,
    });
  }

  public async getSession(sessionId: string): Promise<RuntimeApiRouteResult> {
    const state = await this.session.load(sessionId);

    return this.response.ok({
      session: state as unknown as JsonObject,
    });
  }

  public async routeCommand(
    sessionId: string,
    body: JsonValue | null,
  ): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const rawInput = this.requiredString(input, 'input');
    const state = await this.session.load(sessionId);
    const result = await this.commandRouter.route(state, rawInput);

    this.eventBus.publish({
      name: 'session.command',
      sessionId,
      projectRoot: result.session.projectRoot,
      message: `Interactive command routed: ${rawInput}`,
      payload: {
        command: result.command as unknown as JsonObject,
        status: result.status,
        message: result.message,
      },
    });

    return this.response.ok({
      result: result as unknown as JsonObject,
    });
  }

  public async scanProject(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const rootPath = this.requiredString(input, 'rootPath');

    const scanned = await this.projectScanner.scan({
      rootPath,
      name: this.optionalString(input, 'name'),
      workingMode: this.optionalWorkingMode(input, 'workingMode'),
      gitRequired: this.optionalBoolean(input, 'gitRequired'),
    });

    const registry = await this.projectRegistry.add(scanned.profile);

    this.eventBus.publish({
      name: 'project.scanned',
      projectRoot: scanned.profile.rootPath,
      message: `Project scanned: ${scanned.profile.name}`,
      payload: {
        project: scanned.profile as unknown as JsonObject,
        configPath: scanned.configPath,
      },
    });

    return this.response.created({
      project: scanned.profile as unknown as JsonObject,
      configPath: scanned.configPath,
      registry: registry as unknown as JsonObject,
    });
  }

  public async listProjects(): Promise<RuntimeApiRouteResult> {
    const registry = await this.projectRegistry.list();

    return this.response.ok({
      registry: registry as unknown as JsonObject,
    });
  }

  public async currentProject(): Promise<RuntimeApiRouteResult> {
    const project = await this.projectRegistry.current();

    return this.response.ok({
      project: project ? (project as unknown as JsonObject) : null,
    });
  }

  public async resolveWorkspace(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const projectRoot = this.requiredString(input, 'projectRoot');

    const resolution = await this.workspaceModeResolver.createSession({
      projectRoot,
      requestedMode: this.optionalWorkingMode(input, 'mode'),
      gitRequired: this.optionalBoolean(input, 'gitRequired'),
    });

    this.eventBus.publish({
      name: 'workspace.resolved',
      projectRoot: resolution.projectRoot,
      message: `Workspace resolved in ${resolution.mode} mode.`,
      payload: {
        workspace: resolution as unknown as JsonObject,
      },
    });

    return this.response.ok({
      workspace: resolution as unknown as JsonObject,
    });
  }

  public async createSnapshot(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);

    const result = await this.snapshotManager.create({
      projectRoot: this.requiredString(input, 'projectRoot'),
      sessionId: this.requiredString(input, 'sessionId'),
      targetFiles: this.requiredStringArray(input, 'targetFiles'),
    });

    this.eventBus.publish({
      name: 'snapshot.created',
      sessionId: result.manifest.sessionId,
      projectRoot: result.manifest.projectRoot,
      message: `Local snapshot created: ${result.manifest.snapshotId}`,
      payload: {
        snapshot: result.manifest as unknown as JsonObject,
        manifestPath: result.manifestPath,
      },
    });

    return this.response.created({
      snapshot: result.manifest as unknown as JsonObject,
      manifestPath: result.manifestPath,
    });
  }

  public async captureSnapshotAfter(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const snapshotRoot = this.requiredString(input, 'snapshotRoot');
    const manifest = await this.snapshotManager.readManifest(snapshotRoot);
    const result = await this.snapshotDiffService.captureAfter(manifest);

    this.eventBus.publish({
      name: 'snapshot.after_captured',
      sessionId: manifest.sessionId,
      projectRoot: manifest.projectRoot,
      message: `Snapshot after-state captured: ${manifest.snapshotId}`,
      payload: {
        diff: result as unknown as JsonObject,
      },
    });

    return this.response.ok({
      diff: result as unknown as JsonObject,
    });
  }

  public async restoreSnapshot(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const snapshotRoot = this.requiredString(input, 'snapshotRoot');
    const manifest = await this.snapshotManager.readManifest(snapshotRoot);
    const result = await this.snapshotRestoreService.restore(manifest);

    this.eventBus.publish({
      name: 'snapshot.restored',
      sessionId: manifest.sessionId,
      projectRoot: manifest.projectRoot,
      message: `Snapshot restored: ${manifest.snapshotId}`,
      payload: {
        restore: result as unknown as JsonObject,
      },
    });

    return this.response.ok({
      restore: result as unknown as JsonObject,
    });
  }
  public async listFilesystemRoots(): Promise<RuntimeApiRouteResult> {
    const roots = await this.directoryBrowser.listRoots();

    return this.response.ok({
      roots: roots as unknown as JsonObject[],
    });
  }

  public async listFilesystemChildren(pathValue: string | null): Promise<RuntimeApiRouteResult> {
    if (!pathValue || pathValue.trim().length === 0) {
      throw new Error('Query parameter "path" is required.');
    }

    const result = await this.directoryBrowser.listChildren(pathValue);

    return this.response.ok({
      directory: result as unknown as JsonObject,
    });
  }
  public async getRuntimeSettings(): Promise<RuntimeApiRouteResult> {
    const settings = await this.runtimeSettingsStore.load();

    return this.response.ok({
      settings: settings as unknown as JsonObject,
      settingsPath: this.runtimeSettingsStore.resolvePath(),
    });
  }

  public async saveRuntimeSettings(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const settings = await this.runtimeSettingsStore.save(
      input as unknown as Awaited<ReturnType<RuntimeSettingsStore['load']>>,
    );

    return this.response.ok({
      settings: settings as unknown as JsonObject,
      settingsPath: this.runtimeSettingsStore.resolvePath(),
    });
  }

  public async prepareWorkflow(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const sessionId = this.requiredString(input, 'sessionId');
    const state = await this.session.load(sessionId);

    const result = await this.workflowOrchestrator.prepare({
      sessionId,
      projectRoot: this.optionalString(input, 'projectRoot') ?? state.projectRoot,
      projectName: this.optionalString(input, 'projectName') ?? state.projectName,
      objective: this.optionalString(input, 'objective') ?? state.goal.current,
      workspaceMode: this.optionalString(input, 'workspaceMode'),
      createDefaultTasks: this.optionalBoolean(input, 'createDefaultTasks'),
    });

    this.eventBus.publish({
      name: 'audit.generated',
      sessionId,
      projectRoot: result.projectRoot,
      message: `Runtime workflow prepared for ${result.projectName}.`,
      payload: {
        stack: result.stack.stack,
        tasks: result.tasks.tasks.length,
        routes: result.apiRoutes.routes.length,
        links: result.frontendBackend.links.length,
        questions: result.questions.questions.length,
        suggestions: result.suggestions.length,
      },
    });

    return this.response.ok({
      workflow: result as unknown as JsonObject,
    });
  }
  private async getGeneratedQuestionsForSession(input: { sessionId: string; input: JsonObject }) {
    const state = await this.session.load(input.sessionId);

    const projectName = this.optionalString(input.input, 'projectName') ?? state.projectName;
    const stack = this.optionalStringArray(input.input, 'stack');
    const workspaceMode = this.optionalString(input.input, 'workspaceMode');
    const knownDecisions = this.optionalStringArray(input.input, 'knownDecisions');

    return this.questionEngine.generate({
      objective: this.optionalString(input.input, 'objective') ?? state.goal.current,
      projectRoot: this.optionalString(input.input, 'projectRoot') ?? state.projectRoot,
      projectName,
      ...(stack ? { stack } : {}),
      ...(workspaceMode ? { workspaceMode } : {}),
      ...(knownDecisions ? { knownDecisions } : {}),
      runtimeActions: state.runtimeActions.map((action) => ({
        title: action.title,
        description: action.description,
        status: action.status,
      })),
    });
  }
  public getProviderStatus(): RuntimeApiRouteResult {
    const status = this.providerStatusService.getStatus();

    return this.response.ok({
      providers: status as unknown as JsonObject,
    });
  }
  private asObject(value: JsonValue | null): JsonObject {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Request body must be a JSON object.');
    }

    return value;
  }
  public async getQuestions(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const sessionId = this.optionalString(input, 'sessionId');
    const state = sessionId ? await this.session.load(sessionId) : null;

    const runtimeActions =
      this.optionalRuntimeActions(input) ??
      state?.runtimeActions.map((action) => ({
        title: action.title,
        description: action.description,
        status: action.status,
      }));

    const questionInput = {
      objective: this.optionalString(input, 'objective') ?? state?.goal.current ?? '',
      projectRoot: this.optionalString(input, 'projectRoot') ?? state?.projectRoot ?? '',
      ...((this.optionalString(input, 'projectName') ?? state?.projectName)
        ? { projectName: this.optionalString(input, 'projectName') ?? state?.projectName }
        : {}),
      ...(this.optionalStringArray(input, 'stack')
        ? { stack: this.optionalStringArray(input, 'stack') }
        : {}),
      ...(this.optionalString(input, 'workspaceMode')
        ? { workspaceMode: this.optionalString(input, 'workspaceMode') }
        : {}),
      ...(this.optionalStringArray(input, 'knownDecisions')
        ? { knownDecisions: this.optionalStringArray(input, 'knownDecisions') }
        : {}),
      ...(runtimeActions ? { runtimeActions } : {}),
    };

    const result = this.questionEngine.generate(questionInput);

    return this.response.ok({
      questions: result as unknown as JsonObject,
    });
  }

  public async answerQuestion(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const sessionId = this.requiredString(input, 'sessionId');
    const questionId = this.requiredString(input, 'questionId');
    const answerValue = this.requiredString(input, 'answer');

    const generated = await this.getGeneratedQuestionsForSession({
      sessionId,
      input,
    });

    const question = generated.questions.find((candidate) => candidate.id === questionId);

    if (!question) {
      throw new Error(`Runtime question not found: ${questionId}`);
    }

    const answerState = await this.questionAnswerStore.addAnswer({
      sessionId,
      questionId,
      answer: answerValue,
    });

    const answer = answerState.answers.find((candidate) => candidate.questionId === questionId);

    if (!answer) {
      throw new Error(`Runtime question answer was not saved: ${questionId}`);
    }

    const mapping = this.questionDecisionMapper.map({
      sessionId,
      question,
      answer,
    });

    const decisionResult = await this.sessionDecisionStore.add(mapping.decision);

    const state = await this.session.load(sessionId);

    await this.session.addDecision(state, {
      title: 'Runtime question answered',
      description: mapping.decision.statement,
      reason: mapping.reason,
      metadata: {
        questionId,
        answer: answerValue,
        appliedContext: decisionResult.appliedContext as unknown as JsonObject,
        conflicts: decisionResult.conflicts as unknown as JsonObject[],
      },
    });

    this.eventBus.publish({
      name: 'approval.required',
      sessionId,
      projectRoot: state.projectRoot,
      message: `Runtime question answered and decision recorded: ${mapping.decision.statement}`,
      payload: {
        answer: answer as unknown as JsonObject,
        decision: decisionResult.state.decisions.at(-1) as unknown as JsonObject,
        appliedContext: decisionResult.appliedContext as unknown as JsonObject,
        conflicts: decisionResult.conflicts as unknown as JsonObject[],
      },
    });

    return this.response.created({
      answers: answerState as unknown as JsonObject,
      decision: decisionResult.state.decisions.at(-1) as unknown as JsonObject,
      conflicts: decisionResult.conflicts as unknown as JsonObject[],
      appliedContext: decisionResult.appliedContext as unknown as JsonObject,
    });
  }

  public async getSessionTasks(sessionId: string): Promise<RuntimeApiRouteResult> {
    const state = await this.taskQueue.loadOrCreate(sessionId);
    const progress = await this.taskQueue.progress(sessionId);

    return this.response.ok({
      tasks: state as unknown as JsonObject,
      progress: progress as unknown as JsonObject,
    });
  }

  public async createSessionTask(
    sessionId: string,
    body: JsonValue | null,
  ): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);

    const state = await this.taskQueue.addTask(sessionId, {
      sessionId,
      title: this.requiredString(input, 'title'),
      description: this.requiredString(input, 'description'),
      kind: this.optionalTaskKind(input, 'kind'),
      dependencies: this.optionalStringArray(input, 'dependencies'),
    });

    const progress = await this.taskQueue.progress(sessionId);

    return this.response.created({
      tasks: state as unknown as JsonObject,
      progress: progress as unknown as JsonObject,
    });
  }

  public async transitionSessionTask(
    sessionId: string,
    taskId: string,
    body: JsonValue | null,
  ): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);

    const state = await this.taskQueue.transitionTask({
      sessionId,
      taskId,
      status: this.requiredTaskStatus(input, 'status'),
      reason: this.optionalString(input, 'reason'),
    });

    const progress = await this.taskQueue.progress(sessionId);

    return this.response.ok({
      tasks: state as unknown as JsonObject,
      progress: progress as unknown as JsonObject,
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async listVerifyCommands(): Promise<RuntimeApiRouteResult> {
    return this.response.ok({
      commands: this.verifyCommandRegistry.list() as unknown as JsonObject[],
    });
  }

  public async scanPackageScripts(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const projectRoot = this.requiredString(input, 'projectRoot');
    const result = await this.packageScriptScanner.scan(projectRoot);

    return this.response.ok({
      scripts: result as unknown as JsonObject,
    });
  }

  public async runVerifyCommand(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);

    const result = await this.verifyRunner.run({
      command: this.requiredString(input, 'command'),
      args: this.optionalStringArray(input, 'args') ?? [],
      cwd: this.requiredString(input, 'cwd'),
      approvalState: this.optionalBoolean(input, 'approved') === true ? 'approved' : 'missing',
    });

    const sessionId = this.optionalString(input, 'sessionId');

    if (sessionId) {
      await this.verifyRunStore.add({
        sessionId,
        run: result,
      });

      const state = await this.session.load(sessionId);

      await this.session.addRuntimeAction(state, {
        title: 'Verify command executed',
        description: `${result.command} finished with status ${result.status} and exit code ${
          result.exitCode ?? 'none'
        }.`,
        status: result.status === 'executed' && result.exitCode === 0 ? 'completed' : 'failed',
        metadata: {
          command: result.command,
          exitCode: result.exitCode ?? null,
          durationMs: result.durationMs,
        },
      });

      this.eventBus.publish({
        name: 'verification.completed',
        sessionId,
        projectRoot: result.cwd,
        message: `Verification completed: ${result.command}`,
        payload: {
          verify: result as unknown as JsonObject,
        },
      });
    }

    return this.response.ok({
      verify: result as unknown as JsonObject,
    });
  }

  public async exportSessionReport(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const sessionId = this.requiredString(input, 'sessionId');

    const state = await this.session.load(sessionId);
    const tasks = await this.taskQueue.loadOrCreate(sessionId);
    const taskProgress = await this.taskQueue.progress(sessionId);

    const verifyRuns = await this.verifyRunStore.loadOrCreate(sessionId);
    const decisions = await this.sessionDecisionStore.loadOrCreate(sessionId);
    const questionAnswers = await this.questionAnswerStore.load(sessionId);

    const report = this.sessionReportBuilder.build({
      session: state,
      decisions,
      questionAnswers,
      tasks,
      taskProgress,
      verifyRuns: verifyRuns.runs,
    });

    const saved = await this.reportStorage.save(report);

    this.eventBus.publish({
      name: 'audit.generated',
      sessionId,
      projectRoot: state.projectRoot,
      message: `Session report exported for ${sessionId}.`,
      payload: {
        markdownPath: saved.markdownPath,
        jsonPath: saved.jsonPath,
      },
    });

    return this.response.created({
      report: report as unknown as JsonObject,
      files: saved as unknown as JsonObject,
    });
  }

  public async detectProjectStack(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const projectRoot = this.requiredString(input, 'projectRoot');
    const result = await this.projectStackDetector.detect(projectRoot);

    return this.response.ok({
      intelligence: result as unknown as JsonObject,
    });
  }

  public async mapApiRoutes(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const projectRoot = this.requiredString(input, 'projectRoot');
    const result = await this.expressRouteScanner.scan(projectRoot);

    return this.response.ok({
      routeMap: result as unknown as JsonObject,
    });
  }

  public async linkFrontendBackend(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const projectRoot = this.requiredString(input, 'projectRoot');
    const routeMap = await this.expressRouteScanner.scan(projectRoot);

    const result = await this.frontendBackendLinker.link({
      projectRoot,
      routeMap,
    });

    return this.response.ok({
      links: result as unknown as JsonObject,
    });
  }
  public getSuggestions(body: JsonValue | null): RuntimeApiRouteResult {
    const input = this.asObject(body);
    const projectRoot = this.requiredString(input, 'projectRoot');

    const result = this.suggestionEngine.scan({
      projectRoot,
      projectName: this.optionalString(input, 'projectName'),
      stack: this.optionalStringArray(input, 'stack'),
      workspaceMode: this.optionalString(input, 'workspaceMode'),
      gitAvailable: this.optionalBoolean(input, 'gitAvailable'),
      snapshotAvailable: this.optionalBoolean(input, 'snapshotAvailable'),
      errors: this.optionalStringArray(input, 'errors'),
      runtimeActions: this.optionalRuntimeActions(input),
    });

    return this.response.ok({
      suggestions: result as unknown as JsonObject,
    });
  }
  private requiredString(input: JsonObject, key: string): string {
    const value = input[key];

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`"${key}" must be a non-empty string.`);
    }

    return value;
  }

  private optionalString(input: JsonObject, key: string): string | undefined {
    const value = input[key];

    if (typeof value !== 'string' || value.trim().length === 0) {
      return undefined;
    }

    return value;
  }

  private optionalBoolean(input: JsonObject, key: string): boolean | undefined {
    const value = input[key];

    return typeof value === 'boolean' ? value : undefined;
  }

  private requiredStringArray(input: JsonObject, key: string): string[] {
    const value = input[key];

    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
      throw new Error(`"${key}" must be a string array.`);
    }

    return value;
  }
  private optionalStringArray(input: JsonObject, key: string): string[] | undefined {
    const value = input[key];

    if (!Array.isArray(value)) {
      return undefined;
    }

    const items = value.filter((item): item is string => typeof item === 'string');

    return items.length > 0 ? items : undefined;
  }

  private optionalRuntimeActions(input: JsonObject):
    | {
        title: string;
        description: string;
        status: string;
      }[]
    | undefined {
    const value = input['runtimeActions'];

    if (!Array.isArray(value)) {
      return undefined;
    }

    const actions = value.filter(
      (
        item,
      ): item is {
        title: string;
        description: string;
        status: string;
      } => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          return false;
        }

        return (
          typeof item['title'] === 'string' &&
          typeof item['description'] === 'string' &&
          typeof item['status'] === 'string'
        );
      },
    );

    return actions.length > 0 ? actions : undefined;
  }
  private optionalTaskKind(
    input: JsonObject,
    key: string,
  ):
    | 'inspect'
    | 'context'
    | 'plan'
    | 'patch'
    | 'approval'
    | 'verify'
    | 'report'
    | 'custom'
    | undefined {
    const value = input[key];

    if (
      value === 'inspect' ||
      value === 'context' ||
      value === 'plan' ||
      value === 'patch' ||
      value === 'approval' ||
      value === 'verify' ||
      value === 'report' ||
      value === 'custom'
    ) {
      return value;
    }

    return undefined;
  }

  private requiredTaskStatus(
    input: JsonObject,
    key: string,
  ): 'pending' | 'in_progress' | 'waiting_user' | 'blocked' | 'completed' | 'cancelled' {
    const value = input[key];

    if (
      value === 'pending' ||
      value === 'in_progress' ||
      value === 'waiting_user' ||
      value === 'blocked' ||
      value === 'completed' ||
      value === 'cancelled'
    ) {
      return value;
    }

    throw new Error(`"${key}" must be a valid task status.`);
  }
  private optionalWorkingMode(
    input: JsonObject,
    key: string,
  ): 'local_patchless' | 'local_snapshot' | 'git_diff' | 'git_branch_pr' | undefined {
    const value = input[key];

    if (
      value === 'local_patchless' ||
      value === 'local_snapshot' ||
      value === 'git_diff' ||
      value === 'git_branch_pr'
    ) {
      return value;
    }

    return undefined;
  }
}
