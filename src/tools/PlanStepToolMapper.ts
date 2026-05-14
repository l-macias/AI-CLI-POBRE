import type { RuntimePlanStep } from '../types/PlanningTypes.js';
import type { ToolExecutionRequest, ToolExecutionValidationIssue } from '../types/ToolTypes.js';

export interface PlanStepToolMapperInput {
  planId: string;
  step: RuntimePlanStep;
}

export interface PlanStepToolMapperResult {
  mapped: boolean;
  issues: ToolExecutionValidationIssue[];
  request?: ToolExecutionRequest | undefined;
}

export class PlanStepToolMapper {
  public map(input: PlanStepToolMapperInput): PlanStepToolMapperResult {
    const { planId, step } = input;

    if (step.type === 'run_command') {
      return this.reject('RUN_COMMAND_MAPPING_BLOCKED', 'run_command cannot be mapped to tools.');
    }

    if (!step.toolIntent) {
      return this.reject(
        'STEP_TOOL_INTENT_MISSING',
        `Step "${step.id}" does not define toolIntent.`,
      );
    }

    const targetFromInput = this.getTargetFromInput(step.toolIntent.input);

    if (step.target && targetFromInput && step.target !== targetFromInput) {
      return this.reject(
        'STEP_TARGET_MISMATCH',
        `Step target "${step.target}" does not match tool input target "${targetFromInput}".`,
      );
    }

    const requestedAt = new Date().toISOString();

    return {
      mapped: true,
      issues: [],
      request: {
        id: this.createRequestId(planId, step.id, requestedAt),
        toolName: step.toolIntent.toolName,
        input: step.toolIntent.input,
        requestedAt,
        proposedBy: 'runtime',
      },
    };
  }

  private reject(code: string, message: string): PlanStepToolMapperResult {
    return {
      mapped: false,
      issues: [
        {
          code,
          message,
          severity: 'error',
        },
      ],
    };
  }

  private createRequestId(planId: string, stepId: string, requestedAt: string): string {
    const safeTimestamp = requestedAt.replaceAll(':', '').replaceAll('.', '');

    return `runtime-tool-request-${planId}-${stepId}-${safeTimestamp}`;
  }

  private getTargetFromInput(input: unknown): string | null {
    if (typeof input !== 'object' || input === null || !('target' in input)) {
      return null;
    }

    const candidate = input as { target?: unknown };

    return typeof candidate.target === 'string' ? candidate.target : null;
  }
}
