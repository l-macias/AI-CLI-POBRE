import type { AgentRuntimeStateSnapshot } from '../core/RuntimeState.js';
import type { RuntimePlanReview, RuntimePlanStep } from '../types/PlanningTypes.js';
import type { ToolExecutionValidationIssue } from '../types/ToolTypes.js';

export interface RuntimeToolExecutionGateInput {
  snapshot: AgentRuntimeStateSnapshot;
  stepId: string;
}

export interface RuntimeToolExecutionGateResult {
  allowed: boolean;
  issues: ToolExecutionValidationIssue[];
  review?: RuntimePlanReview | undefined;
  step?: RuntimePlanStep | undefined;
}

export class RuntimeToolExecutionGate {
  public canExecuteStep(input: RuntimeToolExecutionGateInput): RuntimeToolExecutionGateResult {
    const review = input.snapshot.activePlanReview;

    if (!review) {
      return this.block('NO_ACTIVE_PLAN_REVIEW', 'No active plan review is available.');
    }

    if (review.status !== 'ready_for_execution') {
      return this.block(
        'PLAN_NOT_READY_FOR_EXECUTION',
        `Plan status must be "ready_for_execution". Current status: "${review.status}".`,
        review,
      );
    }

    const step = review.plan.steps.find((candidate) => candidate.id === input.stepId);

    if (!step) {
      return this.block(
        'PLAN_STEP_NOT_FOUND',
        `Step "${input.stepId}" was not found in the active plan.`,
        review,
      );
    }

    if (step.type === 'run_command') {
      return this.block(
        'RUN_COMMAND_STEP_BLOCKED',
        'run_command steps are blocked in Session 18.',
        review,
        step,
      );
    }

    if (!step.toolIntent) {
      return this.block(
        'STEP_TOOL_INTENT_MISSING',
        `Step "${step.id}" does not define toolIntent.`,
        review,
        step,
      );
    }

    return {
      allowed: true,
      issues: [],
      review,
      step,
    };
  }

  private block(
    code: string,
    message: string,
    review?: RuntimePlanReview,
    step?: RuntimePlanStep,
  ): RuntimeToolExecutionGateResult {
    return {
      allowed: false,
      issues: [
        {
          code,
          message,
          severity: 'error',
        },
      ],
      review,
      step,
    };
  }
}
