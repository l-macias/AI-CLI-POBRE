import type { AgentRuntimeStateSnapshot } from '../core/RuntimeState.js';
import type { Logger } from '../observability/Logger.js';
import type {
  ExecutionEngineSequentialResult,
  ExecutionEngineStepResult,
  ExecutionRun,
  ExecutionRunStatus,
} from '../types/ExecutionTypes.js';
import type { RuntimePlanReview } from '../types/PlanningTypes.js';
import type { ToolExecutionResult, ToolExecutionValidationIssue } from '../types/ToolTypes.js';
import type { RuntimeToolController } from '../tools/RuntimeToolController.js';
import { ExecutionHistory } from './ExecutionHistory.js';
import { StepExecutionStateMachine } from './StepExecutionStateMachine.js';
import { TaskQueue } from './TaskQueue.js';
import type { RuntimeTracer } from '../observability/RuntimeTracer.js';

export interface ExecutionEngineOptions {
  controller: RuntimeToolController;
  logger: Logger;
  tracer?: RuntimeTracer | undefined;
  history?: ExecutionHistory | undefined;
  stateMachine?: StepExecutionStateMachine | undefined;
}

export interface ExecutionEngineExecuteStepInput {
  snapshot: AgentRuntimeStateSnapshot;
  stepId: string;
}

export interface ExecutionEngineExecuteSequentialInput {
  snapshot: AgentRuntimeStateSnapshot;
  maxSteps?: number | undefined;
}

export class ExecutionEngine {
  private readonly controller: RuntimeToolController;
  private readonly logger: Logger;
  private readonly history: ExecutionHistory;
  private readonly stateMachine: StepExecutionStateMachine;
  private readonly queues = new Map<string, TaskQueue>();
  private readonly tracer: RuntimeTracer | undefined;
  public constructor(options: ExecutionEngineOptions) {
    this.controller = options.controller;
    this.logger = options.logger;
    this.history = options.history ?? new ExecutionHistory();
    this.stateMachine = options.stateMachine ?? new StepExecutionStateMachine();
    this.tracer = options.tracer;
  }

  public async executeStep(
    input: ExecutionEngineExecuteStepInput,
  ): Promise<ExecutionEngineStepResult> {
    const review = input.snapshot.activePlanReview;

    if (!review) {
      return this.createBlockedStepResult({
        planId: 'no-active-plan',
        stepId: input.stepId,
        code: 'NO_ACTIVE_PLAN_REVIEW',
        message: 'No active plan review is available.',
      });
    }

    const timelineEntry = this.tracer?.getTimeline().start({
      label: `Execute step ${input.stepId}`,
      source: 'ExecutionEngine',
      metadata: {
        planId: review.plan.id,
        stepId: input.stepId,
      },
    });

    const queue = this.getOrCreateQueue(review);
    const item = queue.getItem(input.stepId);

    if (!item) {
      const result = await this.createBlockedStepResult({
        planId: review.plan.id,
        stepId: input.stepId,
        code: 'PLAN_STEP_NOT_FOUND',
        message: `Step "${input.stepId}" was not found in the active plan.`,
      });

      if (timelineEntry) {
        this.tracer?.getTimeline().complete({
          id: timelineEntry.id,
          status: 'blocked',
          metadata: {
            toolStatus: result.toolResult.status,
            issues: result.toolResult.issues,
          },
        });
      }

      return result;
    }

    if (item.state.status === 'executed') {
      const result = await this.createBlockedStepResult({
        planId: review.plan.id,
        stepId: input.stepId,
        code: 'STEP_ALREADY_EXECUTED',
        message: `Step "${input.stepId}" was already executed.`,
      });

      if (timelineEntry) {
        this.tracer?.getTimeline().complete({
          id: timelineEntry.id,
          status: 'blocked',
          metadata: {
            toolStatus: result.toolResult.status,
            issues: result.toolResult.issues,
          },
        });
      }

      return result;
    }

    const runningState = this.stateMachine.markRunning(item.state);
    queue.updateState(input.stepId, runningState);

    const toolResult = await this.controller.executeStep({
      snapshot: input.snapshot,
      stepId: input.stepId,
    });

    const completedState = this.stateMachine.markFromToolResult(runningState, toolResult);
    queue.updateState(input.stepId, completedState);

    const run = this.createRun(review, 'single_step');

    await this.history.append({
      runId: run.id,
      planId: review.plan.id,
      stepId: input.stepId,
      status: completedState.status,
      toolName: toolResult.toolName,
      toolStatus: toolResult.status,
      timestamp: new Date().toISOString(),
      issues: toolResult.issues,
    });

    this.logger.info('ExecutionEngine step completed', {
      runId: run.id,
      planId: review.plan.id,
      stepId: input.stepId,
      stepStatus: completedState.status,
      toolStatus: toolResult.status,
    });

    if (timelineEntry) {
      this.tracer?.getTimeline().complete({
        id: timelineEntry.id,
        status:
          completedState.status === 'executed'
            ? 'completed'
            : completedState.status === 'failed'
              ? 'failed'
              : 'blocked',
        metadata: {
          runId: run.id,
          stepStatus: completedState.status,
          toolName: toolResult.toolName,
          toolStatus: toolResult.status,
          issues: toolResult.issues,
        },
      });
    }

    return {
      run,
      step: completedState,
      toolResult,
    };
  }

  public async executeNextStep(
    input: ExecutionEngineExecuteSequentialInput,
  ): Promise<ExecutionEngineStepResult> {
    const review = input.snapshot.activePlanReview;

    if (!review) {
      return this.createBlockedStepResult({
        planId: 'no-active-plan',
        stepId: 'next',
        code: 'NO_ACTIVE_PLAN_REVIEW',
        message: 'No active plan review is available.',
      });
    }

    const queue = this.getOrCreateQueue(review);
    const next = queue.getNextPendingItem();

    if (!next) {
      return this.createBlockedStepResult({
        planId: review.plan.id,
        stepId: 'next',
        code: 'NO_PENDING_STEPS',
        message: 'There are no pending steps to execute.',
      });
    }

    return this.executeStep({
      snapshot: input.snapshot,
      stepId: next.step.id,
    });
  }

  public async executeSequential(
    input: ExecutionEngineExecuteSequentialInput,
  ): Promise<ExecutionEngineSequentialResult> {
    const review = input.snapshot.activePlanReview;

    if (!review) {
      const blocked = await this.createBlockedStepResult({
        planId: 'no-active-plan',
        stepId: 'sequential',
        code: 'NO_ACTIVE_PLAN_REVIEW',
        message: 'No active plan review is available.',
      });

      return {
        run: blocked.run,
        results: [blocked],
      };
    }

    const maxSteps = input.maxSteps ?? review.plan.steps.length;
    const results: ExecutionEngineStepResult[] = [];

    for (let index = 0; index < maxSteps; index += 1) {
      const result = await this.executeNextStep({
        snapshot: input.snapshot,
      });

      results.push(result);

      if (result.step.status !== 'executed') {
        break;
      }
    }

    return {
      run: this.createRun(review, 'sequential'),
      results,
    };
  }

  private getOrCreateQueue(review: RuntimePlanReview): TaskQueue {
    const existing = this.queues.get(review.plan.id);

    if (existing) {
      return existing;
    }

    const queue = new TaskQueue(review.plan, this.stateMachine);
    this.queues.set(review.plan.id, queue);

    return queue;
  }

  private createRun(review: RuntimePlanReview, mode: ExecutionRun['mode']): ExecutionRun {
    const queue = this.getOrCreateQueue(review);
    const timestamp = new Date().toISOString();
    const steps = queue.list().map((item) => item.state);
    const status = this.resolveRunStatus(steps.map((step) => step.status));

    return {
      id: `execution-run-${review.plan.id}-${timestamp.replaceAll(':', '').replaceAll('.', '')}`,
      planId: review.plan.id,
      mode,
      status,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: this.isTerminalStatus(status) ? timestamp : undefined,
      steps,
    };
  }

  private resolveRunStatus(
    statuses: ExecutionRun['steps'][number]['status'][],
  ): ExecutionRunStatus {
    if (statuses.some((status) => status === 'running')) {
      return 'running';
    }

    if (statuses.every((status) => status === 'executed')) {
      return 'completed';
    }

    if (statuses.some((status) => status === 'failed')) {
      return statuses.some((status) => status === 'executed') ? 'partially_completed' : 'failed';
    }

    if (statuses.some((status) => status === 'blocked')) {
      return statuses.some((status) => status === 'executed') ? 'partially_completed' : 'blocked';
    }

    if (statuses.some((status) => status === 'executed')) {
      return 'partially_completed';
    }

    return 'created';
  }

  private isTerminalStatus(status: ExecutionRunStatus): boolean {
    return (
      status === 'completed' ||
      status === 'blocked' ||
      status === 'failed' ||
      status === 'partially_completed'
    );
  }

  private async createBlockedStepResult(input: {
    planId: string;
    stepId: string;
    code: string;
    message: string;
  }): Promise<ExecutionEngineStepResult> {
    const timestamp = new Date().toISOString();

    const issue: ToolExecutionValidationIssue = {
      code: input.code,
      message: input.message,
      severity: 'error',
    };

    const toolResult: ToolExecutionResult = {
      requestId: `execution-engine-blocked-${input.stepId}`,
      toolName: 'execution_engine',
      status: 'not_executed',
      issues: [issue],
      executedAt: timestamp,
      durationMs: 0,
    };

    const step = this.stateMachine.markFromToolResult(
      this.stateMachine.create(input.stepId),
      toolResult,
    );

    const run: ExecutionRun = {
      id: `execution-run-${input.planId}-${timestamp.replaceAll(':', '').replaceAll('.', '')}`,
      planId: input.planId,
      mode: 'single_step',
      status: 'blocked',
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: timestamp,
      steps: [step],
    };

    await this.history.append({
      runId: run.id,
      planId: input.planId,
      stepId: input.stepId,
      status: step.status,
      toolName: toolResult.toolName,
      toolStatus: toolResult.status,
      timestamp,
      issues: toolResult.issues,
    });

    return {
      run,
      step,
      toolResult,
    };
  }
}
