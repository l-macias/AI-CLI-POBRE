import type { Logger } from '../observability/Logger.js';
import type { AgentRuntime } from '../core/AgentRuntime.js';
import { FailureRecovery } from '../failure/FailureRecovery.js';
import type { ExecutionEngineStepResult } from '../types/ExecutionTypes.js';
import type {
  RuntimeLoopRunInput,
  RuntimeLoopRunResult,
  RuntimeLoopState,
  RuntimeLoopStatus,
} from '../types/RuntimeLoopTypes.js';
import { RuntimeLoopReporter } from './RuntimeLoopReporter.js';

export interface RuntimeLoopOptions {
  runtime: AgentRuntime;
  logger: Logger;
  reporter?: RuntimeLoopReporter | undefined;
  failureRecovery?: FailureRecovery | undefined;
}

export class RuntimeLoop {
  private readonly runtime: AgentRuntime;
  private readonly logger: Logger;
  private readonly reporter: RuntimeLoopReporter;
  private readonly failureRecovery: FailureRecovery;

  public constructor(options: RuntimeLoopOptions) {
    this.runtime = options.runtime;
    this.logger = options.logger;
    this.reporter = options.reporter ?? new RuntimeLoopReporter();
    this.failureRecovery =
      options.failureRecovery ??
      new FailureRecovery({
        logger: this.logger,
      });
  }

  public async runOnce(input: RuntimeLoopRunInput): Promise<RuntimeLoopRunResult> {
    let state = this.createState(input);

    try {
      await this.runtime.acceptObjective(input.objective);
      state = this.update(state, 'objective_accepted');

      const plan = await this.runtime.generatePlan();
      state = this.update(state, 'plan_generated', {
        plan,
      });

      if (input.autoApprove === false) {
        state = this.update(state, 'blocked', {
          issues: ['Loop stopped because autoApprove is false.'],
        });

        await this.reporter.append(state);

        return {
          state,
        };
      }

      const approvedReview = await this.runtime.approveActivePlan();
      state = this.update(state, 'plan_approved', {
        review: approvedReview,
      });

      const readyReview = await this.runtime.markActivePlanReadyForExecution();
      state = this.update(state, 'ready_for_execution', {
        review: readyReview,
      });

      const maxSteps = input.maxSteps ?? 1;

      if (maxSteps <= 1) {
        const firstStep = readyReview.plan.steps[0];

        if (!firstStep) {
          state = this.update(state, 'blocked', {
            issues: ['Ready plan has no steps.'],
          });

          await this.reporter.append(state);

          return {
            state,
          };
        }

        const stepResult = await this.runtime.executeActivePlanStepThroughEngine(firstStep.id);

        state = this.update(state, 'step_executed', {
          stepResult,
        });

        state = await this.finishAfterStepResult(state, stepResult, input.recoveryDepth ?? 0);
      } else {
        const sequentialResult = await this.runtime.executeActivePlanSequentially(maxSteps);
        const lastResult = sequentialResult.results.at(-1);

        state = this.update(state, 'step_executed', {
          sequentialResult,
        });

        if (sequentialResult.run.status === 'completed') {
          state = this.update(state, 'completed');
        } else if (lastResult) {
          state = await this.finishAfterStepResult(state, lastResult, input.recoveryDepth ?? 0);
        } else {
          state = this.update(state, 'blocked', {
            issues: ['Sequential execution did not produce step results.'],
          });
        }
      }

      await this.reporter.append(state);

      this.logger.info('Runtime loop completed', {
        loopId: state.id,
        status: state.status,
        planId: state.plan?.id,
        reviewStatus: state.review?.status,
        recoveryAction: state.recoveryResult?.action,
      });

      return {
        state,
      };
    } catch (error) {
      const recoveryResult = await this.failureRecovery.recover({
        loopState: state,
        error,
        depth: input.recoveryDepth ?? 0,
      });

      state = this.update(state, 'failed', {
        recoveryResult,
        issues: [error instanceof Error ? error.message : String(error), recoveryResult.reason],
      });

      await this.reporter.append(state);

      this.logger.error('Runtime loop failed', {
        loopId: state.id,
        status: state.status,
        issues: state.issues,
        recoveryAction: recoveryResult.action,
      });

      return {
        state,
      };
    }
  }

  private async finishAfterStepResult(
    state: RuntimeLoopState,
    stepResult: ExecutionEngineStepResult,
    recoveryDepth: number,
  ): Promise<RuntimeLoopState> {
    if (stepResult.step.status === 'executed') {
      return this.update(state, 'completed');
    }

    const recoveryResult = await this.failureRecovery.recover({
      loopState: state,
      stepResult,
      depth: recoveryDepth,
    });

    return this.update(state, 'recovery_evaluated', {
      recoveryResult,
      issues: [recoveryResult.reason],
    });
  }

  private createState(input: RuntimeLoopRunInput): RuntimeLoopState {
    const timestamp = new Date().toISOString();

    return {
      id: `runtime-loop-${timestamp.replaceAll(':', '').replaceAll('.', '')}`,
      status: 'created',
      createdAt: timestamp,
      updatedAt: timestamp,
      objective: input.objective,
      issues: [],
    };
  }

  private update(
    state: RuntimeLoopState,
    status: RuntimeLoopStatus,
    patch: Partial<RuntimeLoopState> = {},
  ): RuntimeLoopState {
    return {
      ...state,
      ...patch,
      status,
      updatedAt: new Date().toISOString(),
      issues: patch.issues ?? state.issues,
    };
  }
}
