import { loadEnv } from '../config/env.js';
import { Logger } from '../observability/Logger.js';
import { GoalTracker } from '../planning/GoalTracker.js';
import { PlanGenerator } from '../planning/PlanGenerator.js';
import { PlanOptimizer } from '../planning/PlanOptimizer.js';
import { PlanPersistence } from '../planning/PlanPersistence.js';
import { PlanReviewStateMachine } from '../planning/PlanReviewStateMachine.js';
import { PlanValidator } from '../planning/PlanValidator.js';
import { ModelSelector } from '../providers/ModelSelector.js';
import { OpenRouterProvider } from '../providers/OpenRouterProvider.js';
import { ProviderManager } from '../providers/ProviderManager.js';
import { ProviderRuntimePolicy } from '../providers/ProviderRuntimePolicy.js';
import { TokenEstimator } from '../providers/TokenEstimator.js';
import { OperationalStateManager } from '../session/OperationalStateManager.js';
import { createReadOnlyFilesystemTools } from '../tools/filesystem/createReadOnlyFilesystemTools.js';
import { createWriteControlledFilesystemTools } from '../tools/filesystem/createWriteControlledFilesystemTools.js';
import { RuntimeToolController } from '../tools/RuntimeToolController.js';
import { ToolExecutionValidator } from '../tools/ToolExecutionValidator.js';
import { ToolPermissionManager } from '../tools/ToolPermissionManager.js';
import { ToolPermissionPolicy } from '../tools/ToolPermissionPolicy.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { ToolRuntimeExecutor } from '../tools/ToolRuntimeExecutor.js';
import type { RuntimeObjectiveInput } from '../types/ObjectiveTypes.js';
import type { RuntimePlan, RuntimePlanReview } from '../types/PlanningTypes.js';
import type { ToolExecutionResult, ToolPermission } from '../types/ToolTypes.js';
import { ObjectiveAnalyzer } from './ObjectiveAnalyzer.js';
import { RuntimeConfigFactory, type RuntimeConfig } from './RuntimeConfig.js';
import { RuntimeInitializer } from './RuntimeInitializer.js';
import { RuntimeState } from './RuntimeState.js';
import { ExecutionEngine } from '../execution/ExecutionEngine.js';
import { RuntimeTracer } from '../observability/RuntimeTracer.js';
import type {
  ExecutionEngineSequentialResult,
  ExecutionEngineStepResult,
} from '../types/ExecutionTypes.js';
import { RuntimeLoop } from '../loop/RuntimeLoop.js';
import type { RuntimeLoopRunInput, RuntimeLoopRunResult } from '../types/RuntimeLoopTypes.js';
import { PlanningContextRetriever } from '../retrieval/PlanningContextRetriever.js';
export interface AgentRuntimeDependencies {
  logger?: Logger;
  providerRuntimePolicy?: ProviderRuntimePolicy | undefined;
}

export class AgentRuntime {
  private readonly logger: Logger;
  private readonly state = new RuntimeState();
  private readonly toolRegistry: ToolRegistry;
  private readonly toolExecutionValidator: ToolExecutionValidator;
  private readonly toolPermissionManager: ToolPermissionManager;
  private readonly toolRuntimeExecutor: ToolRuntimeExecutor;
  private readonly runtimeToolController: RuntimeToolController;
  private readonly executionEngine: ExecutionEngine;
  private readonly runtimeLoop: RuntimeLoop;
  private readonly planningContextRetriever = new PlanningContextRetriever();
  private readonly providerManager = new ProviderManager();
  private readonly runtimeInitializer = new RuntimeInitializer();
  private readonly operationalStateManager = new OperationalStateManager();
  private readonly objectiveAnalyzer = new ObjectiveAnalyzer();
  private readonly planValidator = new PlanValidator();
  private readonly planOptimizer = new PlanOptimizer();
  private readonly goalTracker = new GoalTracker();
  private readonly planPersistence = new PlanPersistence();
  private readonly planReviewStateMachine = new PlanReviewStateMachine();
  private readonly providerRuntimePolicy: ProviderRuntimePolicy;
  private readonly tokenEstimator = new TokenEstimator();
  private readonly runtimeTracer: RuntimeTracer;

  private latestRuntimeContext = '';

  private config: RuntimeConfig | null = null;

  public constructor(dependencies: AgentRuntimeDependencies = {}) {
    this.logger =
      dependencies.logger ??
      new Logger({
        namespace: 'zero-runtime:agent-runtime',
        level: 'debug',
      });
    this.runtimeTracer = new RuntimeTracer({
      logger: new Logger({
        namespace: 'zero-runtime:observability',
        level: 'info',
      }),
    });
    this.providerRuntimePolicy = dependencies.providerRuntimePolicy ?? new ProviderRuntimePolicy();
    this.toolRegistry = new ToolRegistry();

    this.registerRuntimeTools();

    const runtimeAllowedToolPermissions: readonly ToolPermission[] = ['read', 'write'];

    this.toolExecutionValidator = new ToolExecutionValidator({
      registry: this.toolRegistry,
      permissionPolicy: new ToolPermissionPolicy({
        allowedPermissions: runtimeAllowedToolPermissions,
      }),
    });

    this.toolPermissionManager = new ToolPermissionManager({
      allowedPermissions: runtimeAllowedToolPermissions,
    });

    this.toolRuntimeExecutor = new ToolRuntimeExecutor({
      validator: this.toolExecutionValidator,
      permissionManager: this.toolPermissionManager,
      tracer: this.runtimeTracer,
    });

    this.runtimeToolController = new RuntimeToolController({
      executor: this.toolRuntimeExecutor,
      logger: this.logger,
      tracer: this.runtimeTracer,
    });
    this.executionEngine = new ExecutionEngine({
      controller: this.runtimeToolController,
      logger: this.logger,
      tracer: this.runtimeTracer,
    });
    this.runtimeLoop = new RuntimeLoop({
      runtime: this,
      logger: this.logger,
      tracer: this.runtimeTracer,
    });
  }

  public async initialize(): Promise<void> {
    try {
      this.state.setPhase('initializing');
      this.runtimeTracer.startSession('agent-runtime-session');

      const env = loadEnv();
      const config = RuntimeConfigFactory.fromEnv(env);
      this.config = config;

      const modelSelector = new ModelSelector({
        defaultModel: config.defaultModel,
      });

      const model = modelSelector.selectModel();

      this.providerManager.register(
        new OpenRouterProvider({
          apiKey: env.OPENROUTER_API_KEY,
          baseUrl: env.OPENROUTER_BASE_URL,
        }),
      );

      this.state.setPhase('context_loading');

      const context = await this.runtimeInitializer.initialize({
        maxEstimatedContextTokens: config.maxEstimatedContextTokens,
      });

      this.latestRuntimeContext = context.assembledContext;

      this.state.markInitialized({
        provider: config.defaultProvider,
        model,
        contextTokenEstimate: context.tokenEstimate,
        loadedContextSources: context.sources.map((source) => source.name),
      });

      await this.operationalStateManager.appendProgress({
        session: 'Session 007',
        timestamp: new Date().toISOString(),
        message: 'AgentRuntime initialized with provider manager and local runtime context.',
      });

      this.logger.info('AgentRuntime initialized', {
        config,
        state: this.state.snapshot(),
      });

      this.runtimeTracer.trace({
        type: 'decision_recorded',
        scope: 'session',
        source: 'AgentRuntime',
        message: 'AgentRuntime initialized successfully.',
        metadata: {
          provider: config.defaultProvider,
          model,
          contextTokenEstimate: context.tokenEstimate,
          loadedContextSources: context.sources.map((source) => source.name),
        },
      });
    } catch (error) {
      this.state.markFailed(error);

      this.logger.error('AgentRuntime initialization failed', {
        state: this.state.snapshot(),
        error: error instanceof Error ? error.message : String(error),
      });

      this.runtimeTracer.getErrorReporter().report({
        source: 'AgentRuntime',
        code: 'AGENT_RUNTIME_INITIALIZATION_FAILED',
        error,
        metadata: {
          state: this.state.snapshot(),
        },
      });

      throw error;
    }
  }

  public async acceptObjective(input: RuntimeObjectiveInput): Promise<void> {
    this.ensureInitialized();

    try {
      const objective = this.objectiveAnalyzer.analyze(input);

      this.state.setObjective(objective);

      const snapshot = this.state.snapshot();

      await this.operationalStateManager.writeCurrentState({
        projectName: this.getConfig().projectName,
        sessionName: 'Session 012 - Plan Review State Machine',
        objective: objective.objective,
        activeModule: objective.module,
        status: 'in_progress',
        completed: [
          'Foundation setup',
          'Provider layer',
          'OpenRouter smoke test',
          'Structured output hardening',
          'Model capabilities registry',
          'Session persistence',
          'Session restore and checkpoints',
          'Runtime context loader',
          'AgentRuntime initialization',
          'Runtime objective intake',
          'Plan contract and validation',
          'Plan persistence',
          'Architecture path guardrails',
          'Plan generation retry policy',
        ],
        inProgress: ['Plan review state machine', `Objective: ${objective.normalizedObjective}`],
        pending: [
          'Validation pipeline base',
          'Tool contract base',
          'Tool execution system',
          'Runtime validation pipeline',
        ],
        knownIssues: snapshot.lastError ? [snapshot.lastError] : [],
      });

      await this.operationalStateManager.writeActiveModule(
        objective.module,
        'Runtime-owned plan lifecycle. A valid plan is not automatically executable.',
        [
          'src/core/AgentRuntime.ts',
          'src/core/RuntimeState.ts',
          'src/types/PlanningTypes.ts',
          'src/planning/PlanReviewStateMachine.ts',
          'src/planning/PlanPersistence.ts',
        ],
      );

      await this.operationalStateManager.appendProgress({
        session: 'Session 012',
        timestamp: new Date().toISOString(),
        message: `Accepted objective "${objective.normalizedObjective}" for module "${objective.module}".`,
      });

      this.logger.info('Runtime objective accepted', {
        objective,
        state: this.state.snapshot(),
      });
    } catch (error) {
      this.state.markFailed(error);

      this.logger.error('Runtime objective intake failed', {
        error: error instanceof Error ? error.message : String(error),
        state: this.state.snapshot(),
      });

      throw error;
    }
  }

  public async generatePlan(): Promise<RuntimePlan> {
    this.ensurePlanning();

    const snapshot = this.state.snapshot();

    if (!snapshot.activeObjective) {
      throw new Error('No active objective available for planning.');
    }

    const config = this.getConfig();

    const planningRuntimeContext = await this.buildPlanningRuntimeContext({
      objective: snapshot.activeObjective.normalizedObjective,
      module: snapshot.activeObjective.module,
    });

    const estimatedPromptTokens = this.tokenEstimator.estimateTextTokens(planningRuntimeContext);
    const estimatedCompletionTokens = 1200;

    const providerDecision = this.providerRuntimePolicy.evaluate({
      role: 'planner',
      riskLevel: 'medium',
      requestedModel: snapshot.activeModel ?? config.defaultModel,
      allowPremium: false,
      premiumApproved: false,
      estimatedPromptTokens,
      estimatedCompletionTokens,
    });

    this.logger.info('Runtime planner provider decision evaluated', {
      allowed: providerDecision.allowed,
      provider: providerDecision.selection.provider,
      model: providerDecision.selection.model,
      tier: providerDecision.selection.tier,
      role: providerDecision.selection.role,
      premiumSelected: providerDecision.selection.premiumSelected,
      estimatedCost: providerDecision.budget.estimatedCost,
      issues: providerDecision.budget.issues,
      reason: providerDecision.selection.reason,
    });
    this.runtimeTracer.getDecisionLogViewer().record({
      source: 'AgentRuntime',
      decision: providerDecision.allowed ? 'planner_model_allowed' : 'planner_model_blocked',
      reason: providerDecision.selection.reason,
      metadata: {
        role: providerDecision.selection.role,
        provider: providerDecision.selection.provider,
        model: providerDecision.selection.model,
        tier: providerDecision.selection.tier,
        premiumSelected: providerDecision.selection.premiumSelected,
        estimatedCost: providerDecision.budget.estimatedCost,
        issues: providerDecision.budget.issues,
      },
    });

    if (!providerDecision.allowed) {
      throw new Error(
        `Planner model selection blocked by budget policy: ${providerDecision.budget.issues
          .filter((issue) => issue.severity === 'error')
          .map((issue) => `${issue.code}: ${issue.message}`)
          .join('; ')}`,
      );
    }

    this.logger.info('Runtime plan generation started', {
      objectiveId: snapshot.activeObjective.id,
      objective: snapshot.activeObjective.normalizedObjective,
      module: snapshot.activeObjective.module,
      provider: providerDecision.selection.provider,
      model: providerDecision.selection.model,
      contextTokenEstimate: snapshot.contextTokenEstimate,
      estimatedPromptTokens,
      estimatedCompletionTokens,
    });

    const generator = new PlanGenerator({
      providerManager: this.providerManager,
      providerName: providerDecision.selection.provider,
      model: providerDecision.selection.model,
    });

    const generatedPlan = await generator.generate({
      objective: snapshot.activeObjective,
      runtimeContext: planningRuntimeContext,
    });

    let review = this.planReviewStateMachine.createGenerated(generatedPlan);

    this.state.setActivePlanReview(review);

    this.logger.info('Runtime plan generated by model', {
      planId: generatedPlan.id,
      title: generatedPlan.title,
      riskLevel: generatedPlan.riskLevel,
      stepCount: generatedPlan.steps.length,
      reviewStatus: review.status,
      targets: generatedPlan.steps
        .map((step) => step.target)
        .filter((target): target is string => Boolean(target)),
    });

    const optimizedPlan = this.planOptimizer.optimize(generatedPlan);

    review = this.planReviewStateMachine.createGenerated(optimizedPlan);

    this.logger.info('Runtime plan optimized', {
      planId: optimizedPlan.id,
      stepCount: optimizedPlan.steps.length,
      reviewStatus: review.status,
    });

    const validation = this.planValidator.validate(optimizedPlan);

    review = this.planReviewStateMachine.markValidated(review, validation);

    this.state.setActivePlanReview(review);

    if (review.status === 'rejected') {
      await this.operationalStateManager.appendProgress({
        session: 'Session 012',
        timestamp: new Date().toISOString(),
        message: `Rejected generated plan "${optimizedPlan.title}": ${validation.issues
          .map((issue) => issue.code)
          .join(', ')}`,
      });

      this.logger.warn('Runtime plan rejected', {
        planId: optimizedPlan.id,
        title: optimizedPlan.title,
        reviewStatus: review.status,
        issues: validation.issues,
      });

      throw new Error(
        `Generated plan rejected by runtime validator: ${validation.issues
          .map((issue) => `${issue.code}: ${issue.message}`)
          .join('; ')}`,
      );
    }

    const summary = this.goalTracker.summarize(optimizedPlan);

    await this.planPersistence.persistReviewedPlan(review);

    await this.operationalStateManager.appendProgress({
      session: 'Session 012',
      timestamp: new Date().toISOString(),
      message: `Validated and persisted generated plan "${optimizedPlan.title}" with ${summary.totalSteps} steps. Plan status is "${review.status}", not ready_for_execution.`,
    });

    this.logger.info('Runtime plan validated and persisted', {
      plan: optimizedPlan,
      reviewStatus: review.status,
      summary,
      persistedFiles: ['.runtime/active-plan.json', '.runtime/plan-history.md'],
    });

    return optimizedPlan;
  }

  public async approveActivePlan(): Promise<RuntimePlanReview> {
    this.ensurePlanning();

    const snapshot = this.state.snapshot();

    if (!snapshot.activePlanReview) {
      throw new Error('No active plan review available for approval.');
    }

    const approvedReview = this.planReviewStateMachine.approve(snapshot.activePlanReview);

    this.state.setActivePlanReview(approvedReview);

    await this.planPersistence.persistReviewedPlan(approvedReview);

    await this.operationalStateManager.appendProgress({
      session: 'Session 012',
      timestamp: new Date().toISOString(),
      message: `Approved plan "${approvedReview.plan.title}" with status "${approvedReview.status}".`,
    });

    this.logger.info('Runtime plan approved', {
      planId: approvedReview.plan.id,
      status: approvedReview.status,
    });

    return approvedReview;
  }

  public async markActivePlanReadyForExecution(): Promise<RuntimePlanReview> {
    this.ensurePlanning();

    const snapshot = this.state.snapshot();

    if (!snapshot.activePlanReview) {
      throw new Error('No active plan review available.');
    }

    const readyReview = this.planReviewStateMachine.markReadyForExecution(
      snapshot.activePlanReview,
    );

    this.state.setActivePlanReview(readyReview);

    await this.planPersistence.persistReviewedPlan(readyReview);

    await this.operationalStateManager.appendProgress({
      session: 'Session 012',
      timestamp: new Date().toISOString(),
      message: `Marked plan "${readyReview.plan.title}" as "${readyReview.status}".`,
    });

    this.logger.info('Runtime plan marked ready for execution', {
      planId: readyReview.plan.id,
      status: readyReview.status,
    });

    return readyReview;
  }

  public async executeActivePlanStep(stepId: string): Promise<ToolExecutionResult> {
    this.ensurePlanning();

    const result = await this.runtimeToolController.executeStep({
      snapshot: this.state.snapshot(),
      stepId,
    });

    this.logger.info('Active plan step execution requested', {
      stepId,
      requestId: result.requestId,
      toolName: result.toolName,
      status: result.status,
      issues: result.issues,
    });

    return result;
  }
  public async executeActivePlanStepThroughEngine(
    stepId: string,
  ): Promise<ExecutionEngineStepResult> {
    this.ensurePlanning();

    return this.executionEngine.executeStep({
      snapshot: this.state.snapshot(),
      stepId,
    });
  }

  public async executeNextActivePlanStep(): Promise<ExecutionEngineStepResult> {
    this.ensurePlanning();

    return this.executionEngine.executeNextStep({
      snapshot: this.state.snapshot(),
    });
  }

  public async executeActivePlanSequentially(
    maxSteps?: number,
  ): Promise<ExecutionEngineSequentialResult> {
    this.ensurePlanning();

    return this.executionEngine.executeSequential({
      snapshot: this.state.snapshot(),
      maxSteps,
    });
  }
  public async runRuntimeLoopOnce(input: RuntimeLoopRunInput): Promise<RuntimeLoopRunResult> {
    this.ensureInitialized();

    return this.runtimeLoop.runOnce(input);
  }
  public async runRuntimeLoopOnceWithRecovery(
    input: RuntimeLoopRunInput,
  ): Promise<RuntimeLoopRunResult> {
    this.ensureInitialized();

    return this.runtimeLoop.runOnce({
      ...input,
      recoveryDepth: input.recoveryDepth ?? 0,
    });
  }

  public getProviderRuntimePolicySnapshot() {
    return this.providerRuntimePolicy.snapshot();
  }
  public getStateSnapshot() {
    return this.state.snapshot();
  }

  public getConfig(): RuntimeConfig {
    if (!this.config) {
      throw new Error('Runtime config is not initialized.');
    }

    return this.config;
  }
  public getObservabilitySummary() {
    return this.runtimeTracer.summarizeMetrics();
  }

  public getObservabilityEvents() {
    return this.runtimeTracer.listEvents();
  }

  public getRuntimeTracer(): RuntimeTracer {
    return this.runtimeTracer;
  }
  private ensureInitialized(): void {
    const snapshot = this.state.snapshot();

    if (snapshot.phase !== 'ready' && snapshot.phase !== 'planning') {
      throw new Error(`Runtime is not ready. Current phase: ${snapshot.phase}`);
    }

    if (!this.config) {
      throw new Error('Runtime config is not initialized.');
    }
  }

  private ensurePlanning(): void {
    const snapshot = this.state.snapshot();

    if (snapshot.phase !== 'planning') {
      throw new Error(`Runtime is not in planning phase. Current phase: ${snapshot.phase}`);
    }

    if (!this.config) {
      throw new Error('Runtime config is not initialized.');
    }
  }
  private async buildPlanningRuntimeContext(input: {
    objective: string;
    module: string;
  }): Promise<string> {
    const retrievalContext = await this.planningContextRetriever.retrieve({
      objective: input.objective,
      module: input.module,
      maxChunks: 6,
    });

    this.logger.info('Planning retrieval context assembled', {
      query: retrievalContext.query,
      returnedChunks: retrievalContext.retrieval.chunks.length,
      filesScanned: retrievalContext.retrieval.filesScanned,
      chunksScanned: retrievalContext.retrieval.chunksScanned,
      topFiles: retrievalContext.retrieval.chunks.map((chunk) => chunk.chunk.filePath),
    });

    return `${this.latestRuntimeContext}

---

${retrievalContext.context}`;
  }
  private registerRuntimeTools(): void {
    const tools = [...createReadOnlyFilesystemTools(), ...createWriteControlledFilesystemTools()];

    for (const tool of tools) {
      this.toolRegistry.register(tool);
    }

    this.logger.info('Runtime filesystem tools registered', {
      tools: tools.map((tool) => ({
        name: tool.name,
        permissions: tool.permissions,
      })),
    });
  }
}
