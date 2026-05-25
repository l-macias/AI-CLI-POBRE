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
import { RuntimePlanGenerator } from '../planning/RuntimePlanGenerator.js';
import { PlanStorage } from '../planning/PlanStorage.js';
import { ProviderManager } from '../providers/ProviderManager.js';
import { OpenRouterProvider } from '../providers/OpenRouterProvider.js';
import { RuntimePlanProviderBridge } from '../planning/RuntimePlanProviderBridge.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PatchProposalGenerator } from '../patches/PatchProposalGenerator.js';
import { PatchStorage } from '../patches/PatchStorage.js';
import { PatchDiffBuilder } from '../diff/PatchDiffBuilder.js';
import { PatchDiffStorage } from '../diff/PatchDiffStorage.js';
import { RuntimePatchApplyBridge } from '../patches/RuntimePatchApplyBridge.js';
import type { PatchDiffPreview } from '../diff/PatchDiffTypes.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';
import { RuntimePatchRollback } from '../patches/RuntimePatchRollback.js';
import type { PatchApplyResult } from '../patch-apply/PatchApplyTypes.js';
import { RuntimeWorkflowStateMachine } from '../workflow/RuntimeWorkflowStateMachine.js';
import { RuntimeActionAvailabilityResolver } from '../workflow/RuntimeActionAvailability.js';
import type { RuntimeWorkflowArtifactState } from '../workflow/RuntimeWorkflowState.js';
import { ApprovalCenter } from '../approval/ApprovalCenter.js';
import { ProjectMemoryStore } from '../memory/ProjectMemoryStore.js';
import { CodeIntelligenceReport } from '../code-intelligence/CodeIntelligenceReport.js';
import { RuntimeArtifactStore } from '../artifacts/RuntimeArtifactStore.js';
import type { RuntimeQuestion } from '../interactive/RuntimeQuestion.js';
import { PatchCandidateResolver } from '../patches/PatchCandidateResolver.js';
import { RuntimePatchProviderBridge } from '../patches/RuntimePatchProviderBridge.js';
import { ApprovedPatchBuilder } from '../patches/ApprovedPatchBuilder.js';
import { PatchApplyAuthorization } from '../approval/PatchApplyAuthorization.js';
import { ApprovalDecisionStore } from '../approval/ApprovalDecisionStore.js';
import { PatchSandbox } from '../sandbox/PatchSandbox.js';
import { SandboxResultStorage } from '../sandbox/SandboxResultStorage.js';
import type { PatchSandboxResult } from '../sandbox/SandboxResult.js';
import { PatchRecoveryLoop } from '../patches/PatchRecoveryLoop.js';
import { PatchRecoveryStorage } from '../patches/PatchRecoveryStorage.js';
import type { PatchRecoveryLoopResult } from '../patches/PatchRecoveryLoop.js';

import type {
  ProjectMemoryEntryKind,
  ProjectMemoryImportance,
  ProjectMemoryTrustLevel,
} from '../memory/ProjectMemoryTypes.js';
import type {
  SessionDecisionCategory,
  SessionDecisionStrength,
} from '../interactive/SessionDecision.js';
import type {
  ApprovalCenterArtifactState,
  ApprovalDecisionInput,
  ApprovalDecisionResult,
} from '../approval/ApprovalRequest.js';

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
  runtimePlanGenerator?: RuntimePlanGenerator | undefined;
  planStorage?: PlanStorage | undefined;
  providerManager?: ProviderManager | undefined;
  patchProposalGenerator?: PatchProposalGenerator | undefined;
  patchStorage?: PatchStorage | undefined;
  patchDiffBuilder?: PatchDiffBuilder | undefined;
  patchDiffStorage?: PatchDiffStorage | undefined;
  runtimePatchApplyBridge?: RuntimePatchApplyBridge | undefined;
  runtimePatchRollback?: RuntimePatchRollback | undefined;
  workflowStateMachine?: RuntimeWorkflowStateMachine | undefined;
  workflowActionResolver?: RuntimeActionAvailabilityResolver | undefined;
  approvalCenter?: ApprovalCenter | undefined;
  codeIntelligenceReport?: CodeIntelligenceReport | undefined;
  artifactStore?: RuntimeArtifactStore | undefined;
  patchCandidateResolver?: PatchCandidateResolver | undefined;
  runtimePatchProviderBridge?: RuntimePatchProviderBridge | undefined;
  approvalDecisionStore?: ApprovalDecisionStore | undefined;
  patchSandbox?: PatchSandbox | undefined;
  sandboxResultStorage?: SandboxResultStorage | undefined;
  patchRecoveryLoop?: PatchRecoveryLoop | undefined;
  patchRecoveryStorage?: PatchRecoveryStorage | undefined;
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
  private readonly runtimePlanGenerator: RuntimePlanGenerator;
  private readonly planStorage: PlanStorage;
  private readonly providerManager: ProviderManager;
  private readonly patchProposalGenerator: PatchProposalGenerator;
  private readonly patchStorage: PatchStorage;
  private readonly patchDiffBuilder: PatchDiffBuilder;
  private readonly patchDiffStorage: PatchDiffStorage;
  private readonly runtimePatchApplyBridge: RuntimePatchApplyBridge;
  private readonly runtimePatchRollback: RuntimePatchRollback;
  private readonly workflowStateMachine: RuntimeWorkflowStateMachine;
  private readonly workflowActionResolver: RuntimeActionAvailabilityResolver;
  private readonly approvalCenter: ApprovalCenter;
  private readonly codeIntelligenceReport: CodeIntelligenceReport;
  private readonly artifactStore: RuntimeArtifactStore;
  private readonly patchCandidateResolver: PatchCandidateResolver;
  private readonly runtimePatchProviderBridge: RuntimePatchProviderBridge | null;
  private readonly approvedPatchBuilder: ApprovedPatchBuilder;
  private readonly patchSandbox: PatchSandbox;
  private readonly sandboxResultStorage: SandboxResultStorage;
  private readonly patchApplyAuthorization: PatchApplyAuthorization;
  private readonly approvalDecisionStore: ApprovalDecisionStore;
  private readonly patchRecoveryLoop: PatchRecoveryLoop;
  private readonly patchRecoveryStorage: PatchRecoveryStorage;

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
    this.runtimePlanGenerator = options.runtimePlanGenerator ?? new RuntimePlanGenerator();
    this.planStorage = options.planStorage ?? new PlanStorage();
    this.providerManager = options.providerManager ?? this.createDefaultProviderManager();
    this.patchProposalGenerator = options.patchProposalGenerator ?? new PatchProposalGenerator();
    this.patchCandidateResolver = options.patchCandidateResolver ?? new PatchCandidateResolver();
    this.runtimePatchProviderBridge = options.runtimePatchProviderBridge ?? null;
    this.patchStorage = options.patchStorage ?? new PatchStorage();
    this.patchDiffBuilder = options.patchDiffBuilder ?? new PatchDiffBuilder();
    this.patchDiffStorage = options.patchDiffStorage ?? new PatchDiffStorage();
    this.runtimePatchApplyBridge = options.runtimePatchApplyBridge ?? new RuntimePatchApplyBridge();
    this.runtimePatchRollback = options.runtimePatchRollback ?? new RuntimePatchRollback();
    this.workflowStateMachine = options.workflowStateMachine ?? new RuntimeWorkflowStateMachine();
    this.workflowActionResolver =
      options.workflowActionResolver ?? new RuntimeActionAvailabilityResolver();
    this.approvalCenter = options.approvalCenter ?? new ApprovalCenter();
    this.codeIntelligenceReport = options.codeIntelligenceReport ?? new CodeIntelligenceReport();
    this.artifactStore = options.artifactStore ?? new RuntimeArtifactStore();
    this.approvedPatchBuilder = new ApprovedPatchBuilder();
    this.patchSandbox = options.patchSandbox ?? new PatchSandbox();
    this.sandboxResultStorage = options.sandboxResultStorage ?? new SandboxResultStorage();
    this.patchApplyAuthorization = new PatchApplyAuthorization();
    this.approvalCenter = options.approvalCenter ?? new ApprovalCenter();
    this.approvalDecisionStore = options.approvalDecisionStore ?? new ApprovalDecisionStore();
    this.patchRecoveryLoop = options.patchRecoveryLoop ?? new PatchRecoveryLoop();
    this.patchRecoveryStorage = options.patchRecoveryStorage ?? new PatchRecoveryStorage();
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
  public async listSessions(): Promise<RuntimeApiRouteResult> {
    const sessions = await this.session.list();

    return this.response.ok({
      sessions: sessions as unknown as JsonObject[],
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
  public async listRuntimeArtifacts(): Promise<RuntimeApiRouteResult> {
    const index = await this.artifactStore.index();

    return this.response.ok({
      artifactIndex: index as unknown as JsonObject,
    });
  }

  public async readRuntimeArtifact(pathValue: string | null): Promise<RuntimeApiRouteResult> {
    if (!pathValue || pathValue.trim().length === 0) {
      throw new Error('Query parameter "path" is required.');
    }

    const result = await this.artifactStore.read(pathValue);

    return this.response.ok({
      artifact: result.artifact as unknown as JsonObject,
      content: result.content,
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
  // eslint-disable-next-line @typescript-eslint/require-await
  public async buildWorkflowState(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const artifactState = this.requiredWorkflowArtifactState(input, 'artifactState');
    const workflow = this.workflowStateMachine.build(artifactState);
    const nextAction = this.workflowActionResolver.resolve(workflow);

    return this.response.ok({
      workflow: workflow as unknown as JsonObject,
      nextAction: nextAction as unknown as JsonObject,
    });
  }
  public buildApprovalCenter(body: JsonValue | null): RuntimeApiRouteResult {
    const input = this.asObject(body);
    const artifactState = this.requiredApprovalCenterArtifactState(input, 'artifactState');

    const center = this.approvalCenter.build(artifactState);

    return this.response.ok({
      approvalCenter: center as unknown as JsonObject,
    });
  }

  public async resolveApproval(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const artifactState = this.requiredApprovalCenterArtifactState(input, 'artifactState');
    const decision = this.requiredApprovalDecisionInput(input, 'decision');

    const center = this.approvalCenter.build(artifactState);
    const result = this.approvalCenter.decide(center, decision);

    if (result.accepted) {
      const state = await this.session.load(artifactState.sessionId);
      if (
        artifactState.proposal &&
        artifactState.diff &&
        artifactState.proposal.status === 'validated'
      ) {
        await this.approvalDecisionStore.save({
          sessionId: artifactState.sessionId,
          projectRoot: artifactState.projectRoot,
          proposalId: artifactState.diff.proposalId,
          diffId: artifactState.diff.id,
          decision: result,
        });
      }
      await this.session.addRuntimeAction(state, {
        title: 'Approval decision recorded',
        description: `Approval request ${result.requestId} resolved with action ${result.action}.`,
        status: 'completed',
        metadata: {
          requestId: result.requestId,
          action: result.action,
          selectedFilePaths: result.selectedFilePaths,
          decidedAt: result.decidedAt,
          ...(result.reason ? { reason: result.reason } : {}),
        },
      });

      this.eventBus.publish({
        name: 'approval.required',
        sessionId: artifactState.sessionId,
        projectRoot: artifactState.projectRoot,
        message: `Approval decision recorded: ${result.action}`,
        payload: {
          decision: result as unknown as JsonObject,
        },
      });
    }

    return this.response.ok({
      decision: result as unknown as JsonObject,
      approvalCenter: center as unknown as JsonObject,
    });
  }
  public async getSessionMemory(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const sessionId = this.requiredString(input, 'sessionId');
    const projectRoot = this.requiredString(input, 'projectRoot');
    const projectName = this.optionalString(input, 'projectName');

    const decisions = await this.sessionDecisionStore.inspect(sessionId);
    const projectMemory = await this.createProjectMemoryStore({
      projectRoot,
      projectName,
    }).load();

    return this.response.ok({
      memory: {
        sessionId,
        projectRoot,
        sessionDecisions: decisions.state,
        appliedContext: decisions.appliedContext,
        conflicts: decisions.conflicts,
        projectMemory,
      } as unknown as JsonObject,
    });
  }

  public async addSessionMemoryDecision(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const sessionId = this.requiredString(input, 'sessionId');
    const category = this.requiredSessionDecisionCategory(input, 'category');
    const strength = this.requiredSessionDecisionStrength(input, 'strength');
    const statement = this.requiredString(input, 'statement');

    const result = await this.sessionDecisionStore.add({
      sessionId,
      category,
      strength,
      statement,
      source: 'user',
      metadata: {
        origin: 'session-memory-ui',
      },
    });

    const state = await this.session.load(sessionId);

    await this.session.addDecision(state, {
      title: 'Session memory decision added',
      description: statement,
      reason: `User added ${strength} ${category} decision from Session Memory UI.`,
      metadata: {
        category,
        strength,
        conflicts: result.conflicts as unknown as JsonObject[],
        appliedContext: result.appliedContext as unknown as JsonObject,
      },
    });

    this.eventBus.publish({
      name: 'audit.generated',
      sessionId,
      projectRoot: state.projectRoot,
      message: `Session memory decision added: ${statement}`,
      payload: {
        decision: result.state.decisions.at(-1) as unknown as JsonObject,
        conflicts: result.conflicts as unknown as JsonObject[],
        appliedContext: result.appliedContext as unknown as JsonObject,
      },
    });

    return this.response.created({
      sessionDecisions: result.state as unknown as JsonObject,
      conflicts: result.conflicts as unknown as JsonObject[],
      appliedContext: result.appliedContext as unknown as JsonObject,
    });
  }

  public async addProjectMemoryEntry(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const projectRoot = this.requiredString(input, 'projectRoot');
    const projectName = this.optionalString(input, 'projectName');

    const store = this.createProjectMemoryStore({
      projectRoot,
      projectName,
    });

    const document = await store.append({
      kind: this.requiredProjectMemoryEntryKind(input, 'kind'),
      title: this.requiredString(input, 'title'),
      content: this.requiredString(input, 'content'),
      importance: this.optionalProjectMemoryImportance(input, 'importance') ?? 'medium',
      trustLevel: this.optionalProjectMemoryTrustLevel(input, 'trustLevel') ?? 'user-approved',
      tags: this.optionalStringArray(input, 'tags') ?? ['session-memory-ui'],
      source: this.optionalString(input, 'source'),
    });

    this.eventBus.publish({
      name: 'audit.generated',
      projectRoot,
      message: `Project memory entry added: ${document.entries.at(-1)?.title ?? 'entry'}`,
      payload: {
        memory: document.entries.at(-1) as unknown as JsonObject,
      },
    });

    return this.response.created({
      projectMemory: document as unknown as JsonObject,
    });
  }
  public async generateRuntimePlan(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const sessionId = this.requiredString(input, 'sessionId');
    const instruction = this.requiredString(input, 'instruction');
    const state = await this.session.load(sessionId);
    const useProvider = this.optionalBoolean(input, 'useProvider') === true;
    const model =
      this.optionalString(input, 'model') ??
      (await this.runtimeSettingsStore.load()).model.defaultModel;

    const baseInput = {
      sessionId,
      projectRoot: this.optionalString(input, 'projectRoot') ?? state.projectRoot,
      projectName: this.optionalString(input, 'projectName') ?? state.projectName,
      instruction,
      workspaceMode: this.optionalString(input, 'workspaceMode') ?? 'local_snapshot',
      stack: this.optionalStringArray(input, 'stack'),
      knownFiles: this.optionalStringArray(input, 'knownFiles'),
    };

    const envelope = await this.generateRuntimePlanEnvelope({
      useProvider,
      model,
      baseInput,
    });

    const files = await this.planStorage.save(envelope.result);

    await this.session.addRuntimeAction(state, {
      title: 'Runtime plan generated',
      description: `Runtime generated a ${envelope.result.plan.riskLevel}-risk plan with ${envelope.result.plan.steps.length} step(s) from ${envelope.source}.`,
      status: envelope.result.validation.valid ? 'completed' : 'blocked',
      metadata: {
        source: envelope.source,
        planId: envelope.result.plan.id,
        riskLevel: envelope.result.plan.riskLevel,
        needsSnapshot: envelope.result.plan.needsSnapshot,
        requiresApproval: envelope.result.plan.requiresApproval,
        validation: envelope.result.validation as unknown as JsonObject,
        files: files as unknown as JsonObject,
        ...(envelope.providerAudit
          ? { providerAudit: envelope.providerAudit as unknown as JsonObject }
          : {}),
        ...(envelope.providerFailure ? { providerFailure: envelope.providerFailure } : {}),
        ...(envelope.fallbackReason ? { fallbackReason: envelope.fallbackReason } : {}),
      },
    });

    this.eventBus.publish({
      name: 'audit.generated',
      sessionId,
      projectRoot: envelope.result.plan.projectRoot,
      message: `Runtime plan generated: ${envelope.result.plan.id}`,
      payload: {
        source: envelope.source,
        plan: envelope.result.plan as unknown as JsonObject,
        validation: envelope.result.validation as unknown as JsonObject,
        files: files as unknown as JsonObject,
        ...(envelope.providerAudit
          ? { providerAudit: envelope.providerAudit as unknown as JsonObject }
          : {}),
        ...(envelope.providerFailure ? { providerFailure: envelope.providerFailure } : {}),
        ...(envelope.fallbackReason ? { fallbackReason: envelope.fallbackReason } : {}),
      },
    });

    return this.response.created({
      source: envelope.source,
      plan: envelope.result.plan as unknown as JsonObject,
      validation: envelope.result.validation as unknown as JsonObject,
      files: files as unknown as JsonObject,
      ...(envelope.providerAudit
        ? { providerAudit: envelope.providerAudit as unknown as JsonObject }
        : {}),
      ...(envelope.providerFailure ? { providerFailure: envelope.providerFailure } : {}),
      ...(envelope.fallbackReason ? { fallbackReason: envelope.fallbackReason } : {}),
    });
  }
  public async generatePatchProposal(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const sessionId = this.requiredString(input, 'sessionId');
    const planId = this.requiredString(input, 'planId');
    const summary = this.requiredString(input, 'summary');
    const state = await this.session.load(sessionId);
    const projectRoot = this.optionalString(input, 'projectRoot') ?? state.projectRoot;
    const useProvider = this.optionalBoolean(input, 'useProvider') === true;
    const model =
      this.optionalString(input, 'model') ??
      (await this.runtimeSettingsStore.load()).model.defaultModel;

    const resolvedCandidates = await this.patchCandidateResolver.resolve({
      projectRoot,
      candidates: this.requiredPatchCandidateFiles(input, 'candidateFiles'),
      maxFiles: 6,
      maxFileBytes: 36_000,
    });

    if (resolvedCandidates.length === 0) {
      throw new Error(
        'Patch proposal requires resolved real files. Run Prepare Workflow/Analyze Project or provide concrete candidate files.',
      );
    }

    const verifyCommands = this.optionalPatchVerifyCommands(input, 'verifyCommands') ?? [
      {
        command: 'npm',
        args: ['run', 'typecheck'],
        reason: 'Validate TypeScript correctness after reviewed changes.',
        requiresApproval: true,
      },
    ];

    const riskLevel = this.optionalPatchRiskLevel(input, 'riskLevel') ?? 'medium';

    const result =
      useProvider || this.runtimePatchProviderBridge
        ? await this.generateProviderPatchProposal({
            model,
            planId,
            sessionId,
            projectRoot,
            summary,
            riskLevel,
            verifyCommands,
            candidates: resolvedCandidates,
          })
        : this.patchProposalGenerator.generate({
            planId,
            sessionId,
            projectRoot,
            summary,
            riskLevel,
            candidateFiles: resolvedCandidates,
            verifyCommands,
          });

    const files = await this.patchStorage.save(result);

    await this.session.addRuntimeAction(state, {
      title: 'Patch proposal generated',
      description: `Runtime generated a ${result.proposal.riskLevel}-risk patch proposal with ${result.proposal.files.length} file change(s). No files were applied.`,
      status: result.validation.valid ? 'completed' : 'blocked',
      metadata: {
        proposalId: result.proposal.id,
        planId,
        riskLevel: result.proposal.riskLevel,
        validation: result.validation as unknown as JsonObject,
        files: files as unknown as JsonObject,
        source: useProvider ? 'provider' : 'runtime',
      },
    });

    this.eventBus.publish({
      name: 'audit.generated',
      sessionId,
      projectRoot: result.proposal.projectRoot,
      message: `Patch proposal generated: ${result.proposal.id}`,
      payload: {
        source: useProvider ? 'provider' : 'runtime',
        proposal: result.proposal as unknown as JsonObject,
        validation: result.validation as unknown as JsonObject,
        files: files as unknown as JsonObject,
      },
    });

    return this.response.created({
      source: useProvider ? 'provider' : 'runtime',
      proposal: result.proposal as unknown as JsonObject,
      validation: result.validation as unknown as JsonObject,
      files: files as unknown as JsonObject,
    });
  }
  public async generatePatchDiff(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const proposal = this.requiredRuntimePatchProposal(input, 'proposal');
    const selectedFilePaths = this.optionalStringArray(input, 'selectedFilePaths');

    const approvedPatch =
      selectedFilePaths && selectedFilePaths.length > 0
        ? this.approvedPatchBuilder.build({
            proposal,
            selectedFilePaths,
          })
        : null;

    const proposalForDiff = approvedPatch?.proposal ?? proposal;

    if (proposalForDiff.status !== 'validated') {
      throw new Error('Patch diff preview requires a validated patch proposal.');
    }

    const result = this.patchDiffBuilder.build({
      proposal: proposalForDiff,
    });

    const files = await this.patchDiffStorage.save(result);

    const state = await this.session.load(proposalForDiff.sessionId);

    await this.session.addRuntimeAction(state, {
      title: 'Patch diff preview generated',
      description: `Runtime generated a diff preview for ${result.diff.summary.filesChanged} file(s). No files were applied.`,
      status: 'completed',
      metadata: {
        diffId: result.diff.id,
        proposalId: proposalForDiff.id,
        ...(approvedPatch
          ? {
              originalProposalId: approvedPatch.originalProposalId,
              selectedFilePaths: approvedPatch.selectedFilePaths,
              rejectedFilePaths: approvedPatch.rejectedFilePaths,
            }
          : {}),
        summary: result.diff.summary as unknown as JsonObject,
        files: files as unknown as JsonObject,
      },
    });

    this.eventBus.publish({
      name: 'audit.generated',
      sessionId: proposalForDiff.sessionId,
      projectRoot: proposalForDiff.projectRoot,
      message: `Patch diff preview generated: ${result.diff.id}`,
      payload: {
        diff: result.diff as unknown as JsonObject,
        files: files as unknown as JsonObject,
      },
    });

    return this.response.created({
      diff: result.diff as unknown as JsonObject,
      files: files as unknown as JsonObject,
    });
  }
  public async verifyPatchSandbox(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const proposal = this.requiredRuntimePatchProposal(input, 'proposal');
    const selectedFilePaths = this.optionalStringArray(input, 'selectedFilePaths');

    const approvedPatch =
      selectedFilePaths && selectedFilePaths.length > 0
        ? this.approvedPatchBuilder.build({
            proposal,
            selectedFilePaths,
          })
        : null;

    const proposalForSandbox = approvedPatch?.proposal ?? proposal;

    const result = await this.patchSandbox.verify({
      proposal: proposalForSandbox,
      verifyCommands: proposalForSandbox.verifyCommands,
      approvalState: 'approved',
    });

    const files = await this.sandboxResultStorage.save(result);

    const state = await this.session.load(proposalForSandbox.sessionId);

    await this.session.addRuntimeAction(state, {
      title: 'Patch sandbox verification executed',
      description: `Sandbox verification finished with status ${result.status}.`,
      status:
        result.status === 'passed'
          ? 'completed'
          : result.status === 'blocked'
            ? 'blocked'
            : 'failed',
      metadata: {
        sandboxResultId: result.id,
        proposalId: proposalForSandbox.id,
        ...(approvedPatch
          ? {
              originalProposalId: approvedPatch.originalProposalId,
              selectedFilePaths: approvedPatch.selectedFilePaths,
              rejectedFilePaths: approvedPatch.rejectedFilePaths,
            }
          : {}),
        sandboxStatus: result.status,
        verifyRuns: result.verifyRuns as unknown as JsonObject[],
        issues: result.issues as unknown as JsonObject[],
        files: files as unknown as JsonObject,
      },
    });

    this.eventBus.publish({
      name: 'audit.generated',
      sessionId: proposalForSandbox.sessionId,
      projectRoot: proposalForSandbox.projectRoot,
      message: `Patch sandbox verification executed: ${result.id}`,
      payload: {
        sandbox: result as unknown as JsonObject,
        files: files as unknown as JsonObject,
      },
    });

    return this.response.created({
      sandbox: result as unknown as JsonObject,
      files: files as unknown as JsonObject,
    });
  }
  public async preparePatchRecovery(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const originalObjective = this.requiredString(input, 'originalObjective');
    const proposal = this.requiredRuntimePatchProposal(input, 'proposal');
    const sandboxResult = this.requiredPatchSandboxResult(input, 'sandboxResult');
    const currentAttempt = this.optionalNumber(input, 'currentAttempt') ?? 1;
    const maxAttempts = this.optionalNumber(input, 'maxAttempts') ?? 2;

    const recovery = this.patchRecoveryLoop.prepareRepair({
      originalObjective,
      proposal,
      sandboxResult,
      currentAttempt,
      maxAttempts,
    });

    const files = await this.patchRecoveryStorage.save(recovery);
    const state = await this.session.load(proposal.sessionId);

    await this.session.addRuntimeAction(state, {
      title: 'Patch recovery prepared',
      description: `Patch recovery finished with status ${recovery.status}.`,
      status:
        recovery.status === 'repair_prompt_ready'
          ? 'completed'
          : recovery.status === 'max_attempts_reached'
            ? 'blocked'
            : 'failed',
      metadata: {
        recovery: recovery as unknown as JsonObject,
        files: files as unknown as JsonObject,
      },
    });

    this.eventBus.publish({
      name: 'audit.generated',
      sessionId: proposal.sessionId,
      projectRoot: proposal.projectRoot,
      message: `Patch recovery prepared: ${recovery.id}`,
      payload: {
        recovery: recovery as unknown as JsonObject,
        files: files as unknown as JsonObject,
      },
    });

    return this.response.created({
      recovery: recovery as unknown as JsonObject,
      files: files as unknown as JsonObject,
    });
  }
  public async generatePatchRecoveryProposal(
    body: JsonValue | null,
  ): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const originalProposal = this.requiredRuntimePatchProposal(input, 'originalProposal');
    const recovery = this.requiredPatchRecoveryLoopResult(input, 'recovery');
    const model =
      this.optionalString(input, 'model') ??
      (await this.runtimeSettingsStore.load()).model.defaultModel;

    if (recovery.status !== 'repair_prompt_ready') {
      throw new Error('Patch recovery proposal generation requires repair_prompt_ready status.');
    }

    const firstAttempt = recovery.attempts[0];

    if (!firstAttempt) {
      throw new Error('Patch recovery proposal generation requires at least one recovery attempt.');
    }

    const failedFiles = firstAttempt.failureReport.failedFiles.map((filePath) => ({
      path: filePath,
      existsKnown: true,
      reason: 'File failed sandbox verification and is eligible for repair.',
    }));

    const resolvedCandidates = await this.patchCandidateResolver.resolve({
      projectRoot: originalProposal.projectRoot,
      candidates: failedFiles,
      maxFiles: 6,
      maxFileBytes: 36_000,
    });

    if (resolvedCandidates.length === 0) {
      throw new Error('Patch recovery provider repair requires resolved failed files.');
    }

    const bridge =
      this.runtimePatchProviderBridge ??
      new RuntimePatchProviderBridge({
        providerManager: this.providerManager,
        model,
      });

    const repaired = await bridge.repair({
      originalProposal,
      repairPrompt: firstAttempt.repairPrompt,
      candidates: resolvedCandidates,
      verifyCommands: originalProposal.verifyCommands,
    });

    const files = await this.patchStorage.save(repaired.result);
    const state = await this.session.load(originalProposal.sessionId);

    await this.session.addRuntimeAction(state, {
      title: 'Patch recovery proposal generated',
      description: `Provider generated repaired patch proposal ${repaired.result.proposal.id}.`,
      status: repaired.result.validation.valid ? 'completed' : 'blocked',
      metadata: {
        originalProposalId: originalProposal.id,
        repairedProposalId: repaired.result.proposal.id,
        recoveryId: recovery.id,
        validation: repaired.result.validation as unknown as JsonObject,
        files: files as unknown as JsonObject,
        providerAudit: repaired.audit as unknown as JsonObject,
      },
    });

    this.eventBus.publish({
      name: 'audit.generated',
      sessionId: originalProposal.sessionId,
      projectRoot: originalProposal.projectRoot,
      message: `Patch recovery proposal generated: ${repaired.result.proposal.id}`,
      payload: {
        originalProposalId: originalProposal.id,
        recovery: recovery as unknown as JsonObject,
        proposal: repaired.result.proposal as unknown as JsonObject,
        validation: repaired.result.validation as unknown as JsonObject,
        files: files as unknown as JsonObject,
        providerAudit: repaired.audit as unknown as JsonObject,
      },
    });

    return this.response.created({
      source: 'provider',
      proposal: repaired.result.proposal as unknown as JsonObject,
      validation: repaired.result.validation as unknown as JsonObject,
      files: files as unknown as JsonObject,
      providerAudit: repaired.audit as unknown as JsonObject,
    });
  }
  public async applyRuntimePatch(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const proposal = this.requiredRuntimePatchProposal(input, 'proposal');
    const selectedFilePaths = this.optionalStringArray(input, 'selectedFilePaths');
    const approvedPatch =
      selectedFilePaths && selectedFilePaths.length > 0
        ? this.approvedPatchBuilder.build({
            proposal,
            selectedFilePaths,
          })
        : null;

    const proposalToApply = approvedPatch?.proposal ?? proposal;
    const diff = this.requiredPatchDiffPreview(input, 'diff');
    const applyConfirmed = this.optionalBoolean(input, 'applyConfirmed') === true;
    const dryRun = this.optionalBoolean(input, 'dryRun') === true;
    const snapshotId = this.optionalString(input, 'snapshotId');
    const approvalDecision = this.optionalApprovalDecisionResult(input, 'approvalDecision');
    const sandboxResult = this.optionalPatchSandboxResult(input, 'sandboxResult');
    const storedApprovalDecision =
      approvalDecision ??
      (
        await this.approvalDecisionStore.findLatest({
          sessionId: proposalToApply.sessionId,
          proposalId: proposalToApply.id,
          diffId: diff.id,
        })
      )?.decision ??
      null;
    if (!dryRun) {
      this.assertSandboxPassedForApply({
        proposal: proposalToApply,
        diff,
        sandboxResult,
      });
    }
    if (!dryRun) {
      const authorization = this.patchApplyAuthorization.authorize({
        proposal: proposalToApply,
        diff,
        decision: storedApprovalDecision,
      });

      if (!authorization.authorized) {
        throw new Error(
          `Runtime patch apply authorization failed: ${authorization.issues
            .map((issue) => `${issue.code}: ${issue.message}`)
            .join(' | ')}`,
        );
      }
    }

    const result = await this.runtimePatchApplyBridge.apply({
      proposal: proposalToApply,
      diff,
      applyConfirmed,
      ...(snapshotId ? { snapshotId } : {}),
      dryRun,
      allowDirtyWorkingTree: this.optionalBoolean(input, 'allowDirtyWorkingTree'),
      allowMissingRepository: this.optionalBoolean(input, 'allowMissingRepository'),
      backupEnabled: this.optionalBoolean(input, 'backupEnabled') ?? true,
    });

    const state = await this.session.load(proposalToApply.sessionId);

    await this.session.addRuntimeAction(state, {
      title: 'Runtime patch apply executed',
      description: `Runtime patch apply finished with status ${result.status}.`,
      status:
        result.status === 'applied' || result.status === 'dry_run'
          ? 'completed'
          : result.status === 'blocked'
            ? 'blocked'
            : 'failed',
      metadata: {
        applyId: result.id,
        proposalId: proposalToApply.id,
        ...(approvedPatch
          ? {
              originalProposalId: approvedPatch.originalProposalId,
              selectedFilePaths: approvedPatch.selectedFilePaths,
              rejectedFilePaths: approvedPatch.rejectedFilePaths,
            }
          : {}),
        diffId: diff.id,
        approvalDecision: storedApprovalDecision
          ? (storedApprovalDecision as unknown as JsonObject)
          : null,
        sandboxResult: sandboxResult ? (sandboxResult as unknown as JsonObject) : null,
        status: result.status,
        operationResults: result.operationResults as unknown as JsonObject[],
        issues: result.issues as unknown as JsonObject[],
      },
    });

    this.eventBus.publish({
      name: 'audit.generated',
      sessionId: proposalToApply.sessionId,
      projectRoot: proposalToApply.projectRoot,
      message: `Runtime patch apply executed: ${result.id}`,
      payload: {
        apply: result as unknown as JsonObject,
      },
    });

    return this.response.created({
      apply: {
        ...(result as unknown as JsonObject),
        sessionId: proposalToApply.sessionId,
      },
    });
  }

  private async generateProviderPatchProposal(input: {
    model: string;
    planId: string;
    sessionId: string;
    projectRoot: string;
    summary: string;
    riskLevel: 'low' | 'medium' | 'high';
    verifyCommands: {
      command: 'npm' | 'tsc';
      args: string[];
      reason: string;
      requiresApproval: true;
    }[];
    candidates: Awaited<ReturnType<PatchCandidateResolver['resolve']>>;
  }): Promise<ReturnType<PatchProposalGenerator['generate']>> {
    const bridge =
      this.runtimePatchProviderBridge ??
      new RuntimePatchProviderBridge({
        providerManager: this.providerManager,
        model: input.model,
      });

    const generated = await bridge.generate({
      planId: input.planId,
      sessionId: input.sessionId,
      projectRoot: input.projectRoot,
      objective: input.summary,
      riskLevel: input.riskLevel,
      candidates: input.candidates,
      verifyCommands: input.verifyCommands,
      constraints: [
        'Modify only resolved candidate files.',
        'Do not touch backend, database, .env, secrets, dependency files, build outputs or protected paths.',
        'Return full replacement content.',
        'Do not apply files directly.',
      ],
    });

    return generated.result;
  }
  private requiredPatchApplyResult(
    input: JsonObject,
    key: string,
  ): PatchApplyResult & { sessionId: string } {
    const value = input[key];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`"${key}" must be a patch apply result object.`);
    }

    const record = value as Record<string, unknown>;

    return {
      id: this.requiredRecordString(record, 'id', key),
      status: this.requiredPatchApplyStatus(record, 'status', key),
      projectRoot: this.requiredRecordString(record, 'projectRoot', key),
      proposalId: this.requiredRecordString(record, 'proposalId', key),
      sessionId: this.requiredRecordString(record, 'sessionId', key),
      gitBoundary: this.requiredPatchApplyGitBoundary(record, 'gitBoundary'),
      plan: this.requiredPatchApplyPlan(record, 'plan'),
      contentChecks: this.requiredPatchApplyContentChecks(record, 'contentChecks'),
      operationResults: this.requiredPatchApplyOperationResults(record, 'operationResults'),
      issues: this.requiredPatchApplyIssues(record, 'issues'),
      createdAt: this.requiredRecordString(record, 'createdAt', key),
      completedAt: this.requiredRecordString(record, 'completedAt', key),
    };
  }

  private requiredPatchApplyStatus(
    record: Record<string, unknown>,
    key: string,
    label: string,
  ): PatchApplyResult['status'] {
    const value = record[key];

    if (value === 'applied' || value === 'blocked' || value === 'failed' || value === 'dry_run') {
      return value;
    }

    throw new Error(`"${label}.${key}" must be applied, blocked, failed, or dry_run.`);
  }
  private serializeProviderFailure(error: unknown): JsonObject {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        ...('code' in error && typeof error.code === 'string' ? { code: error.code } : {}),
        ...('cause' in error ? { cause: this.toJsonObject(error.cause) } : {}),
      };
    }

    return {
      name: 'UnknownProviderError',
      message: String(error),
    };
  }

  private toJsonObject(value: unknown): JsonObject {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {
        value: String(value),
      };
    }

    return value as JsonObject;
  }
  private requiredPatchApplyGitBoundary(
    record: Record<string, unknown>,
    key: string,
  ): PatchApplyResult['gitBoundary'] {
    const value = record[key];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`"applyResult.${key}" must be an object.`);
    }

    return value as PatchApplyResult['gitBoundary'];
  }

  private requiredApprovalCenterArtifactState(
    input: JsonObject,
    key: string,
  ): ApprovalCenterArtifactState {
    const value = input[key];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`"${key}" must be an approval center artifact state object.`);
    }

    const record = value as Record<string, unknown>;

    return {
      sessionId: this.requiredRecordString(record, 'sessionId', key),
      projectRoot: this.requiredRecordString(record, 'projectRoot', key),
      plan: this.optionalObjectValue(record, 'plan') as ApprovalCenterArtifactState['plan'],
      proposal: this.optionalObjectValue(
        record,
        'proposal',
      ) as ApprovalCenterArtifactState['proposal'],
      diff: this.optionalObjectValue(record, 'diff') as ApprovalCenterArtifactState['diff'],
      applyResult: this.optionalObjectValue(
        record,
        'applyResult',
      ) as ApprovalCenterArtifactState['applyResult'],
      lastVerifyRun: this.optionalObjectValue(
        record,
        'lastVerifyRun',
      ) as ApprovalCenterArtifactState['lastVerifyRun'],
      snapshotAvailable: this.requiredRecordBoolean(record, 'snapshotAvailable', key),
      dirtyWorkingTree: this.requiredRecordBoolean(record, 'dirtyWorkingTree', key),
    };
  }
  private requiredPatchSandboxResult(input: JsonObject, key: string): PatchSandboxResult {
    const value = this.optionalPatchSandboxResult(input, key);

    if (!value) {
      throw new Error(`"${key}" is required.`);
    }

    return value;
  }
  private requiredPatchRecoveryLoopResult(input: JsonObject, key: string): PatchRecoveryLoopResult {
    const value = input[key];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`"${key}" must be a patch recovery result object.`);
    }

    const record = value as Record<string, unknown>;
    const status = record['status'];

    if (
      status !== 'repair_prompt_ready' &&
      status !== 'max_attempts_reached' &&
      status !== 'not_recoverable'
    ) {
      throw new Error(`"${key}.status" must be a valid patch recovery status.`);
    }

    if (!Array.isArray(record['attempts'])) {
      throw new Error(`"${key}.attempts" must be an array.`);
    }

    return value as unknown as PatchRecoveryLoopResult;
  }
  private optionalPatchSandboxResult(input: JsonObject, key: string): PatchSandboxResult | null {
    const value = input[key];

    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`"${key}" must be a sandbox result object or null.`);
    }

    const record = value as Record<string, unknown>;

    const status = record['status'];

    if (status !== 'passed' && status !== 'failed' && status !== 'blocked') {
      throw new Error(`"${key}.status" must be passed, failed, or blocked.`);
    }

    return value as unknown as PatchSandboxResult;
  }

  private assertSandboxPassedForApply(input: {
    proposal: RuntimePatchProposal;
    diff: PatchDiffPreview;
    sandboxResult: PatchSandboxResult | null;
  }): void {
    if (!input.sandboxResult) {
      throw new Error('Real patch apply requires a passed sandbox verification result.');
    }

    if (input.sandboxResult.status !== 'passed') {
      throw new Error(
        `Real patch apply requires passed sandbox verification. Current sandbox status: ${input.sandboxResult.status}.`,
      );
    }

    if (input.sandboxResult.proposalId !== input.proposal.id) {
      throw new Error('Sandbox result proposalId does not match proposal being applied.');
    }

    if (input.sandboxResult.sessionId !== input.proposal.sessionId) {
      throw new Error('Sandbox result sessionId does not match proposal sessionId.');
    }

    if (input.sandboxResult.projectRoot !== input.proposal.projectRoot) {
      throw new Error('Sandbox result projectRoot does not match proposal projectRoot.');
    }

    if (input.diff.proposalId !== input.proposal.id) {
      throw new Error('Patch diff proposalId does not match proposal being applied.');
    }
  }
  private optionalApprovalDecisionResult(
    input: JsonObject,
    key: string,
  ): ApprovalDecisionResult | null {
    const value = input[key];

    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`"${key}" must be an approval decision result object or null.`);
    }

    const record = value as Record<string, unknown>;
    const blockedReason = this.optionalRecordString(record, 'blockedReason');
    const reason = this.optionalRecordString(record, 'reason');

    return {
      requestId: this.requiredRecordString(record, 'requestId', key),
      action: this.requiredApprovalAction(record, 'action', key),
      accepted: this.requiredRecordBoolean(record, 'accepted', key),
      selectedFilePaths: this.requiredRecordStringArray(record, 'selectedFilePaths', key),
      ...(blockedReason ? { blockedReason } : {}),
      ...(reason ? { reason } : {}),
      decidedAt: this.requiredRecordString(record, 'decidedAt', key),
    };
  }

  private requiredApprovalDecisionInput(input: JsonObject, key: string): ApprovalDecisionInput {
    const value = input[key];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`"${key}" must be an approval decision object.`);
    }

    const record = value as Record<string, unknown>;
    const action = this.requiredApprovalAction(record, 'action', key);
    const selectedFilePaths = this.optionalRecordStringArray(record, 'selectedFilePaths');
    const reason = this.optionalRecordString(record, 'reason');

    return {
      requestId: this.requiredRecordString(record, 'requestId', key),
      action,
      ...(selectedFilePaths ? { selectedFilePaths } : {}),
      ...(reason ? { reason } : {}),
    };
  }

  private requiredApprovalAction(
    record: Record<string, unknown>,
    key: string,
    label: string,
  ): ApprovalDecisionInput['action'] {
    const value = record[key];

    if (
      value === 'approve' ||
      value === 'reject' ||
      value === 'ask_revision' ||
      value === 'approve_selected_files'
    ) {
      return value;
    }

    throw new Error(`"${label}.${key}" must be a valid approval action.`);
  }
  private createProjectMemoryStore(input: {
    projectRoot: string;
    projectName?: string | undefined;
  }): ProjectMemoryStore {
    return new ProjectMemoryStore({
      projectRoot: input.projectRoot,
      ...(input.projectName ? { projectName: input.projectName } : {}),
    });
  }

  private requiredSessionDecisionCategory(input: JsonObject, key: string): SessionDecisionCategory {
    const value = input[key];

    if (
      value === 'scope' ||
      value === 'coding_style' ||
      value === 'workspace' ||
      value === 'permission' ||
      value === 'architecture' ||
      value === 'security' ||
      value === 'workflow'
    ) {
      return value;
    }

    throw new Error(`"${key}" must be a valid session decision category.`);
  }

  private requiredSessionDecisionStrength(input: JsonObject, key: string): SessionDecisionStrength {
    const value = input[key];

    if (value === 'preference' || value === 'constraint' || value === 'hard_rule') {
      return value;
    }

    throw new Error(`"${key}" must be preference, constraint, or hard_rule.`);
  }

  private requiredProjectMemoryEntryKind(input: JsonObject, key: string): ProjectMemoryEntryKind {
    const value = input[key];

    if (
      value === 'fact' ||
      value === 'decision' ||
      value === 'constraint' ||
      value === 'session_note' ||
      value === 'known_file'
    ) {
      return value;
    }

    throw new Error(`"${key}" must be a valid project memory entry kind.`);
  }

  private optionalProjectMemoryImportance(
    input: JsonObject,
    key: string,
  ): ProjectMemoryImportance | undefined {
    const value = input[key];

    if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') {
      return value;
    }

    return undefined;
  }

  private optionalProjectMemoryTrustLevel(
    input: JsonObject,
    key: string,
  ): ProjectMemoryTrustLevel | undefined {
    const value = input[key];

    if (
      value === 'user-approved' ||
      value === 'runtime-generated' ||
      value === 'provider-suggested' ||
      value === 'quarantined'
    ) {
      return value;
    }

    return undefined;
  }

  private optionalObjectValue(record: Record<string, unknown>, key: string): object | null {
    const value = record[key];

    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`"${key}" must be an object or null.`);
    }

    return value;
  }

  private optionalRecordString(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];

    if (typeof value !== 'string' || value.trim().length === 0) {
      return undefined;
    }

    return value;
  }

  private optionalRecordStringArray(
    record: Record<string, unknown>,
    key: string,
  ): string[] | undefined {
    const value = record[key];

    if (!Array.isArray(value)) {
      return undefined;
    }

    const items = value.filter((item): item is string => typeof item === 'string');

    return items.length > 0 ? items : undefined;
  }
  private requiredPatchApplyPlan(
    record: Record<string, unknown>,
    key: string,
  ): PatchApplyResult['plan'] {
    const value = record[key];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`"applyResult.${key}" must be an object.`);
    }

    return value as PatchApplyResult['plan'];
  }

  private requiredPatchApplyContentChecks(
    record: Record<string, unknown>,
    key: string,
  ): PatchApplyResult['contentChecks'] {
    const value = record[key];

    if (!Array.isArray(value)) {
      throw new Error(`"applyResult.${key}" must be an array.`);
    }

    return value as PatchApplyResult['contentChecks'];
  }

  private requiredPatchApplyIssues(
    record: Record<string, unknown>,
    key: string,
  ): PatchApplyResult['issues'] {
    const value = record[key];

    if (!Array.isArray(value)) {
      throw new Error(`"applyResult.${key}" must be an array.`);
    }

    return value as PatchApplyResult['issues'];
  }

  private requiredPatchApplyOperationResults(
    record: Record<string, unknown>,
    key: string,
  ): PatchApplyResult['operationResults'] {
    const value = record[key];

    if (!Array.isArray(value)) {
      throw new Error(`"applyResult.${key}" must be an array.`);
    }

    return value as PatchApplyResult['operationResults'];
  }
  public async rollbackRuntimePatch(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const applyResult = this.requiredPatchApplyResult(input, 'applyResult');

    const result = await this.runtimePatchRollback.rollback({
      applyResult,
      rollbackConfirmed: this.optionalBoolean(input, 'rollbackConfirmed') === true,
      dryRun: this.optionalBoolean(input, 'dryRun'),
    });

    const state = await this.session.load(applyResult.sessionId);

    await this.session.addRuntimeAction(state, {
      title: 'Runtime patch rollback executed',
      description: `Runtime patch rollback finished with status ${result.status}.`,
      status:
        result.status === 'rolled_back' || result.status === 'dry_run'
          ? 'completed'
          : result.status === 'blocked'
            ? 'blocked'
            : 'failed',
      metadata: {
        rollbackId: result.id,
        applyId: result.applyId,
        proposalId: result.proposalId,
        status: result.status,
        operationResults: result.operationResults as unknown as JsonObject[],
        issues: result.issues as unknown as JsonObject[],
      },
    });

    this.eventBus.publish({
      name: 'audit.generated',
      sessionId: applyResult.sessionId,
      projectRoot: result.projectRoot,
      message: `Runtime patch rollback executed: ${result.id}`,
      payload: {
        rollback: result as unknown as JsonObject,
      },
    });

    return this.response.created({
      rollback: result as unknown as JsonObject,
    });
  }
  private async readPatchCandidateFiles(input: {
    projectRoot: string;
    files: {
      path: string;
      existsKnown: boolean;
      reason: string;
    }[];
  }): Promise<
    {
      path: string;
      content?: string | undefined;
      existsKnown: boolean;
      reason: string;
    }[]
  > {
    const result = [];

    for (const file of input.files) {
      if (!file.existsKnown) {
        result.push(file);
        continue;
      }

      try {
        const content = await readFile(path.join(input.projectRoot, file.path), 'utf8');

        result.push({
          ...file,
          content,
        });
      } catch {
        result.push({
          ...file,
          existsKnown: false,
        });
      }
    }

    return result;
  }
  private requiredRuntimePatchProposal(input: JsonObject, key: string): RuntimePatchProposal {
    const value = input[key];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`"${key}" must be a patch proposal object.`);
    }

    const record = value as Record<string, unknown>;

    return {
      id: this.requiredRecordString(record, 'id', key),
      planId: this.requiredRecordString(record, 'planId', key),
      sessionId: this.requiredRecordString(record, 'sessionId', key),
      projectRoot: this.requiredRecordString(record, 'projectRoot', key),
      summary: this.requiredRecordString(record, 'summary', key),
      files: this.requiredRuntimePatchFiles(record, 'files'),
      risks: this.requiredRuntimePatchRisks(record, 'risks'),
      verifyCommands: this.requiredRuntimePatchVerifyCommands(record, 'verifyCommands'),
      riskLevel: this.requiredRuntimePatchRiskLevel(record, 'riskLevel'),
      requiresApproval: true,
      status: this.requiredRuntimePatchStatus(record, 'status'),
      createdAt: this.requiredRecordString(record, 'createdAt', key),
    };
  }
  private requiredPatchDiffPreview(input: JsonObject, key: string): PatchDiffPreview {
    const value = input[key];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`"${key}" must be a patch diff preview object.`);
    }

    const record = value as Record<string, unknown>;

    return {
      id: this.requiredRecordString(record, 'id', key),
      proposalId: this.requiredRecordString(record, 'proposalId', key),
      planId: this.requiredRecordString(record, 'planId', key),
      sessionId: this.requiredRecordString(record, 'sessionId', key),
      projectRoot: this.requiredRecordString(record, 'projectRoot', key),
      files: this.requiredPatchDiffFiles(record, 'files'),
      summary: this.requiredPatchDiffSummary(record, 'summary'),
      safeToPreview: this.requiredRecordBoolean(record, 'safeToPreview', key),
      createdAt: this.requiredRecordString(record, 'createdAt', key),
    };
  }

  private requiredPatchDiffFiles(
    record: Record<string, unknown>,
    key: string,
  ): PatchDiffPreview['files'] {
    const value = record[key];

    if (!Array.isArray(value)) {
      throw new Error(`"diff.${key}" must be an array.`);
    }

    return value.map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new Error(`"diff.${key}" item ${String(index)} must be an object.`);
      }

      const file = item as Record<string, unknown>;
      const label = `diff.${key}.${String(index)}`;

      return {
        path: this.requiredRecordString(file, 'path', label),
        status: this.requiredPatchDiffFileStatus(file, 'status', label),
        beforeHash: this.optionalRecordStringOrNull(file, 'beforeHash'),
        afterHash: this.optionalRecordStringOrNull(file, 'afterHash'),
        additions: this.requiredRecordNumber(file, 'additions', label),
        deletions: this.requiredRecordNumber(file, 'deletions', label),
        beforeContent: this.optionalRecordStringOrNull(file, 'beforeContent'),
        afterContent: this.optionalRecordStringOrNull(file, 'afterContent'),
        lines: this.requiredPatchDiffLines(file, 'lines', label),
      };
    });
  }

  private requiredPatchDiffLines(
    record: Record<string, unknown>,
    key: string,
    label: string,
  ): PatchDiffPreview['files'][number]['lines'] {
    const value = record[key];

    if (!Array.isArray(value)) {
      throw new Error(`"${label}.${key}" must be an array.`);
    }

    return value.map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new Error(`"${label}.${key}" item ${String(index)} must be an object.`);
      }

      const line = item as Record<string, unknown>;
      const lineLabel = `${label}.${key}.${String(index)}`;

      return {
        lineNumber: this.requiredRecordNumber(line, 'lineNumber', lineLabel),
        type: this.requiredPatchDiffLineType(line, 'type', lineLabel),
        content: this.requiredRecordStringAllowEmpty(line, 'content', lineLabel),
      };
    });
  }

  private requiredPatchDiffSummary(
    record: Record<string, unknown>,
    key: string,
  ): PatchDiffPreview['summary'] {
    const value = record[key];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`"diff.${key}" must be an object.`);
    }

    const summary = value as Record<string, unknown>;

    return {
      filesChanged: this.requiredRecordNumber(summary, 'filesChanged', `diff.${key}`),
      additions: this.requiredRecordNumber(summary, 'additions', `diff.${key}`),
      deletions: this.requiredRecordNumber(summary, 'deletions', `diff.${key}`),
    };
  }

  private requiredRecordBoolean(
    record: Record<string, unknown>,
    key: string,
    label: string,
  ): boolean {
    const value = record[key];

    if (typeof value !== 'boolean') {
      throw new Error(`"${label}.${key}" must be boolean.`);
    }

    return value;
  }

  private requiredRecordNumber(
    record: Record<string, unknown>,
    key: string,
    label: string,
  ): number {
    const value = record[key];

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`"${label}.${key}" must be a finite number.`);
    }

    return value;
  }

  private requiredPatchDiffFileStatus(
    record: Record<string, unknown>,
    key: string,
    label: string,
  ): 'added' | 'modified' | 'deleted' | 'unchanged' {
    const value = record[key];

    if (value === 'added' || value === 'modified' || value === 'deleted' || value === 'unchanged') {
      return value;
    }

    throw new Error(`"${label}.${key}" must be added, modified, deleted, or unchanged.`);
  }

  private requiredPatchDiffLineType(
    record: Record<string, unknown>,
    key: string,
    label: string,
  ): 'context' | 'added' | 'removed' {
    const value = record[key];

    if (value === 'context' || value === 'added' || value === 'removed') {
      return value;
    }

    throw new Error(`"${label}.${key}" must be context, added, or removed.`);
  }
  private requiredRuntimePatchFiles(
    record: Record<string, unknown>,
    key: string,
  ): RuntimePatchProposal['files'] {
    const value = record[key];

    if (!Array.isArray(value)) {
      throw new Error(`"proposal.${key}" must be an array.`);
    }

    return value.map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new Error(`"proposal.${key}" item ${String(index)} must be an object.`);
      }

      const file = item as Record<string, unknown>;

      const label = `proposal.${key}.${String(index)}`;

      return {
        path: this.requiredRecordString(file, 'path', label),
        operation: this.requiredRuntimePatchOperation(file, 'operation', label),
        beforeHash: this.optionalRecordStringOrNull(file, 'beforeHash'),
        content: this.optionalRecordStringOrNull(file, 'content'),
        reason: this.requiredRecordString(file, 'reason', label),
        changesSummary: this.requiredRecordStringArray(file, 'changesSummary', label),
        riskLevel: this.requiredRuntimePatchRiskLevel(file, 'riskLevel', label),
        userSelectable: this.requiredRecordTrue(file, 'userSelectable', label),
      };
    });
  }

  private requiredRuntimePatchRisks(
    record: Record<string, unknown>,
    key: string,
  ): RuntimePatchProposal['risks'] {
    const value = record[key];

    if (!Array.isArray(value)) {
      throw new Error(`"proposal.${key}" must be an array.`);
    }

    return value.map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new Error(`"proposal.${key}" item ${String(index)} must be an object.`);
      }

      const risk = item as Record<string, unknown>;

      return {
        code: this.requiredRecordString(risk, 'code', `proposal.${key}.${String(index)}`),
        level: this.requiredRuntimePatchRiskLevel(
          risk,
          'level',
          `proposal.${key}.${String(index)}`,
        ),
        message: this.requiredRecordString(risk, 'message', `proposal.${key}.${String(index)}`),
        mitigation: this.requiredRecordString(
          risk,
          'mitigation',
          `proposal.${key}.${String(index)}`,
        ),
      };
    });
  }

  private requiredRuntimePatchVerifyCommands(
    record: Record<string, unknown>,
    key: string,
  ): RuntimePatchProposal['verifyCommands'] {
    const value = record[key];

    if (!Array.isArray(value)) {
      throw new Error(`"proposal.${key}" must be an array.`);
    }

    return value.map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new Error(`"proposal.${key}" item ${String(index)} must be an object.`);
      }

      const command = item as Record<string, unknown>;
      const commandValue = command['command'];
      const args = command['args'];
      const requiresApproval = command['requiresApproval'];

      if (commandValue !== 'npm' && commandValue !== 'tsc') {
        throw new Error(`"proposal.${key}" item ${String(index)} command is invalid.`);
      }

      if (!Array.isArray(args) || !args.every((arg) => typeof arg === 'string')) {
        throw new Error(`"proposal.${key}" item ${String(index)} args must be string array.`);
      }

      if (requiresApproval !== true) {
        throw new Error(`"proposal.${key}" item ${String(index)} requiresApproval must be true.`);
      }

      return {
        command: commandValue,
        args,
        reason: this.requiredRecordString(command, 'reason', `proposal.${key}.${String(index)}`),
        requiresApproval,
      };
    });
  }

  private requiredRecordString(
    record: Record<string, unknown>,
    key: string,
    label: string,
  ): string {
    const value = record[key];

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`"${label}.${key}" must be a non-empty string.`);
    }

    return value;
  }
  private requiredRecordStringArray(
    record: Record<string, unknown>,
    key: string,
    label: string,
  ): string[] {
    const value = record[key];

    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
      throw new Error(`"${label}.${key}" must be a string array.`);
    }

    return value;
  }

  private requiredRecordTrue(record: Record<string, unknown>, key: string, label: string): true {
    const value = record[key];

    if (value !== true) {
      throw new Error(`"${label}.${key}" must be true.`);
    }

    return true;
  }
  private requiredRecordStringAllowEmpty(
    record: Record<string, unknown>,
    key: string,
    label: string,
  ): string {
    const value = record[key];

    if (typeof value !== 'string') {
      throw new Error(`"${label}.${key}" must be a string.`);
    }

    return value;
  }
  private optionalRecordStringOrNull(record: Record<string, unknown>, key: string): string | null {
    const value = record[key];

    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new Error(`"${key}" must be string or null.`);
    }

    return value;
  }

  private requiredRuntimePatchOperation(
    record: Record<string, unknown>,
    key: string,
    label: string,
  ): 'modify' | 'create' | 'delete' {
    const value = record[key];

    if (value === 'modify' || value === 'create' || value === 'delete') {
      return value;
    }

    throw new Error(`"${label}.${key}" must be modify, create, or delete.`);
  }

  private requiredRuntimePatchRiskLevel(
    record: Record<string, unknown>,
    key: string,
    label = 'proposal',
  ): 'low' | 'medium' | 'high' {
    const value = record[key];

    if (value === 'low' || value === 'medium' || value === 'high') {
      return value;
    }

    throw new Error(`"${label}.${key}" must be low, medium, or high.`);
  }

  private requiredRuntimePatchStatus(
    record: Record<string, unknown>,
    key: string,
  ): 'generated' | 'validated' | 'rejected' {
    const value = record[key];

    if (value === 'generated' || value === 'validated' || value === 'rejected') {
      return value;
    }

    throw new Error(`"proposal.${key}" must be generated, validated, or rejected.`);
  }
  private requiredPatchCandidateFiles(
    input: JsonObject,
    key: string,
  ): {
    path: string;
    existsKnown: boolean;
    reason: string;
  }[] {
    const value = input[key];

    if (!Array.isArray(value)) {
      throw new Error(`"${key}" must be an array.`);
    }

    return value.map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new Error(`"${key}" item ${String(index)} must be an object.`);
      }

      const record = item as Record<string, unknown>;
      const pathValue = record['path'];
      const existsKnown = record['existsKnown'];
      const reason = record['reason'];

      if (typeof pathValue !== 'string' || pathValue.trim().length === 0) {
        throw new Error(`"${key}" item ${String(index)} path must be a non-empty string.`);
      }

      if (typeof existsKnown !== 'boolean') {
        throw new Error(`"${key}" item ${String(index)} existsKnown must be boolean.`);
      }

      if (typeof reason !== 'string' || reason.trim().length === 0) {
        throw new Error(`"${key}" item ${String(index)} reason must be a non-empty string.`);
      }

      return {
        path: pathValue,
        existsKnown,
        reason,
      };
    });
  }

  private optionalPatchRiskLevel(
    input: JsonObject,
    key: string,
  ): 'low' | 'medium' | 'high' | undefined {
    const value = input[key];

    if (value === 'low' || value === 'medium' || value === 'high') {
      return value;
    }

    return undefined;
  }

  private optionalPatchVerifyCommands(
    input: JsonObject,
    key: string,
  ):
    | {
        command: 'npm' | 'tsc';
        args: string[];
        reason: string;
        requiresApproval: true;
      }[]
    | undefined {
    const value = input[key];

    if (!Array.isArray(value)) {
      return undefined;
    }

    return value.flatMap((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        return [];
      }

      const record = item as Record<string, unknown>;
      const command = record['command'];
      const args = record['args'];
      const reason = record['reason'];
      const requiresApproval = record['requiresApproval'];

      if (command !== 'npm' && command !== 'tsc') {
        return [];
      }

      if (!Array.isArray(args) || !args.every((arg) => typeof arg === 'string')) {
        return [];
      }

      if (typeof reason !== 'string' || reason.trim().length === 0) {
        return [];
      }

      if (requiresApproval !== true) {
        return [];
      }

      return [
        {
          command,
          args,
          reason,
          requiresApproval,
        },
      ];
    });
  }
  private async generateRuntimePlanEnvelope(input: {
    useProvider: boolean;
    model: string;
    baseInput: {
      sessionId: string;
      projectRoot: string;
      projectName: string;
      instruction: string;
      workspaceMode: string;
      stack?: string[] | undefined;
      knownFiles?: string[] | undefined;
    };
  }): Promise<{
    source: 'runtime' | 'provider' | 'fallback';
    result: ReturnType<RuntimePlanGenerator['generate']>;
    providerAudit?: Awaited<ReturnType<RuntimePlanProviderBridge['generate']>>['audit'] | undefined;
    providerFailure?: JsonObject | undefined;
    fallbackReason?: string | undefined;
  }> {
    if (!input.useProvider) {
      return {
        source: 'runtime',
        result: this.runtimePlanGenerator.generate(input.baseInput),
      };
    }

    try {
      const bridge = new RuntimePlanProviderBridge({
        providerManager: this.providerManager,
        model: input.model,
      });

      const generated = await bridge.generate(input.baseInput);

      return {
        source: 'provider',
        result: generated.result,
        providerAudit: generated.audit,
      };
    } catch (error) {
      return {
        source: 'fallback',
        result: this.runtimePlanGenerator.generate(input.baseInput),
        providerFailure: this.serializeProviderFailure(error),
        fallbackReason: error instanceof Error ? error.message : String(error),
      };
    }
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
  private requiredWorkflowArtifactState(
    input: JsonObject,
    key: string,
  ): RuntimeWorkflowArtifactState {
    const value = input[key];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`"${key}" must be a workflow artifact state object.`);
    }

    const record = value as Record<string, unknown>;

    return {
      sessionStarted: this.requiredRecordBoolean(record, 'sessionStarted', key),
      workflowPrepared: this.requiredRecordBoolean(record, 'workflowPrepared', key),
      planValid: this.requiredRecordBoolean(record, 'planValid', key),
      planRejected: this.requiredRecordBoolean(record, 'planRejected', key),
      patchProposalValid: this.requiredRecordBoolean(record, 'patchProposalValid', key),
      patchProposalRejected: this.requiredRecordBoolean(record, 'patchProposalRejected', key),
      diffReady: this.requiredRecordBoolean(record, 'diffReady', key),
      diffBlocked: this.requiredRecordBoolean(record, 'diffBlocked', key),
      snapshotAvailable: this.requiredRecordBoolean(record, 'snapshotAvailable', key),
      dryRunCompleted: this.requiredRecordBoolean(record, 'dryRunCompleted', key),
      applyApplied: this.requiredRecordBoolean(record, 'applyApplied', key),
      applyBlocked: this.requiredRecordBoolean(record, 'applyBlocked', key),
      applyFailed: this.requiredRecordBoolean(record, 'applyFailed', key),
      rollbackDryRunCompleted: this.requiredRecordBoolean(record, 'rollbackDryRunCompleted', key),
      rollbackCompleted: this.requiredRecordBoolean(record, 'rollbackCompleted', key),
      rollbackBlocked: this.requiredRecordBoolean(record, 'rollbackBlocked', key),
      rollbackFailed: this.requiredRecordBoolean(record, 'rollbackFailed', key),
      verifyCompleted: this.requiredRecordBoolean(record, 'verifyCompleted', key),
      reportExported: this.requiredRecordBoolean(record, 'reportExported', key),
      riskLevel: this.optionalWorkflowRiskLevel(record, 'riskLevel'),
    };
  }

  private optionalWorkflowRiskLevel(
    record: Record<string, unknown>,
    key: string,
  ): 'low' | 'medium' | 'high' | null {
    const value = record[key];

    if (value === null || value === undefined) {
      return null;
    }

    if (value === 'low' || value === 'medium' || value === 'high') {
      return value;
    }

    throw new Error(`"${key}" must be low, medium, high, or null.`);
  }
  public getProviderStatus(): RuntimeApiRouteResult {
    const status = this.providerStatusService.getStatus();

    return this.response.ok({
      providers: status as unknown as JsonObject,
    });
  }
  private createDefaultProviderManager(): ProviderManager {
    const manager = new ProviderManager();

    manager.register(
      new OpenRouterProvider({
        apiKey: process.env['OPENROUTER_API_KEY'],
        baseUrl: process.env['OPENROUTER_BASE_URL'] ?? 'https://openrouter.ai/api/v1',
      }),
    );

    return manager;
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

    const question =
      generated.questions.find((candidate) => candidate.id === questionId) ??
      this.createFallbackRuntimeQuestion({
        questionId,
        answer: answerValue,
      });

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
  public async generateContextGraph(body: JsonValue | null): Promise<RuntimeApiRouteResult> {
    const input = this.asObject(body);
    const projectRoot = this.requiredString(input, 'projectRoot');

    const previousCwd = process.cwd();

    try {
      process.chdir(projectRoot);

      const report = await this.codeIntelligenceReport.generate({
        query: this.optionalString(input, 'query'),
        targetFilePath: this.optionalString(input, 'targetFilePath'),
        maxChunks: this.optionalPositiveNumber(input, 'maxChunks') ?? 8,
        maxRelatedFiles: this.optionalPositiveNumber(input, 'maxRelatedFiles') ?? 8,
        maxFilesToScan: this.optionalPositiveNumber(input, 'maxFilesToScan') ?? 10,
      });

      return this.response.ok({
        contextGraph: report as unknown as JsonObject,
      });
    } finally {
      process.chdir(previousCwd);
    }
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
  private optionalNumber(input: JsonObject, key: string): number | undefined {
    const value = input[key];

    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`"${key}" must be a finite number.`);
    }

    return value;
  }
  private optionalPositiveNumber(input: JsonObject, key: string): number | undefined {
    const value = input[key];

    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return undefined;
    }

    return Math.floor(value);
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
  private createFallbackRuntimeQuestion(input: {
    questionId: string;
    answer: string;
  }): RuntimeQuestion {
    const normalized = `${input.questionId} ${input.answer}`.toLowerCase();

    return {
      id: input.questionId,
      category: this.inferRuntimeQuestionCategory(normalized),
      priority: 'medium',
      question: `Recovered runtime question: ${input.questionId}`,
      reason:
        'Question was answered after the generated question set changed. Runtime recovered it safely.',
      answerKind: 'free_text',
      options: [],
      createdAt: new Date().toISOString(),
      metadata: {
        recovered: true,
        originalQuestionId: input.questionId,
      },
    };
  }

  private inferRuntimeQuestionCategory(text: string): RuntimeQuestion['category'] {
    if (
      text.includes('security') ||
      text.includes('seguridad') ||
      text.includes('.env') ||
      text.includes('secret') ||
      text.includes('credential')
    ) {
      return 'security';
    }

    if (
      text.includes('permission') ||
      text.includes('approval') ||
      text.includes('approve') ||
      text.includes('permiso') ||
      text.includes('aprobar')
    ) {
      return 'permission';
    }

    if (
      text.includes('workspace') ||
      text.includes('snapshot') ||
      text.includes('git') ||
      text.includes('branch')
    ) {
      return 'workspace';
    }

    if (
      text.includes('architecture') ||
      text.includes('arquitectura') ||
      text.includes('pattern') ||
      text.includes('modular')
    ) {
      return 'architecture';
    }

    if (
      text.includes('verify') ||
      text.includes('verification') ||
      text.includes('test') ||
      text.includes('typecheck')
    ) {
      return 'verification';
    }

    return 'scope';
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
