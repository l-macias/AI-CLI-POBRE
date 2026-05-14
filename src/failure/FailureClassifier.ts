import type {
  FailureClassificationInput,
  FailureKind,
  RuntimeFailure,
} from '../types/FailureTypes.js';
import type { ToolExecutionValidationIssue } from '../types/ToolTypes.js';

export class FailureClassifier {
  public classify(input: FailureClassificationInput): RuntimeFailure {
    const timestamp = new Date().toISOString();
    const issues = this.resolveIssues(input);
    const kind = this.resolveKind(input, issues);

    return {
      id: `failure-${timestamp.replaceAll(':', '').replaceAll('.', '')}`,
      kind,
      message: this.resolveMessage(input, issues, kind),
      stepId: input.stepResult?.step.stepId,
      planId: input.stepResult?.run.planId,
      issues,
      createdAt: timestamp,
      retryable: this.isRetryable(kind),
      replanAllowed: this.isReplanAllowed(kind),
    };
  }

  private resolveIssues(input: FailureClassificationInput): ToolExecutionValidationIssue[] {
    if (input.stepResult) {
      return input.stepResult.toolResult.issues;
    }

    if (input.error) {
      return [
        {
          code: 'RUNTIME_ERROR',
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          message: input.error instanceof Error ? input.error.message : String(input.error),
          severity: 'error',
        },
      ];
    }

    return [];
  }

  private resolveKind(
    input: FailureClassificationInput,
    issues: ToolExecutionValidationIssue[],
  ): FailureKind {
    const codes = issues.map((issue) => issue.code);

    if (input.stepResult?.step.status === 'executed') {
      return 'none';
    }

    if (codes.includes('STEP_ALREADY_EXECUTED')) {
      return 'step_already_executed';
    }

    if (codes.includes('PLAN_STEP_NOT_FOUND')) {
      return 'missing_step';
    }

    if (codes.includes('NO_PENDING_STEPS')) {
      return 'no_pending_steps';
    }

    if (codes.some((code) => code.includes('PROTECTED'))) {
      return 'protected_path';
    }

    if (codes.some((code) => code.includes('PERMISSION'))) {
      return 'permission_denied';
    }

    if (input.stepResult?.toolResult.status === 'failed') {
      return 'tool_failed';
    }

    if (input.stepResult?.toolResult.status === 'not_executed') {
      return 'tool_blocked';
    }

    if (input.error) {
      return 'unknown';
    }

    return 'none';
  }

  private resolveMessage(
    input: FailureClassificationInput,
    issues: ToolExecutionValidationIssue[],
    kind: FailureKind,
  ): string {
    if (issues[0]) {
      return issues[0].message;
    }

    if (input.error) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return input.error instanceof Error ? input.error.message : String(input.error);
    }

    return `Failure classified as "${kind}".`;
  }

  private isRetryable(kind: FailureKind): boolean {
    return kind === 'tool_failed';
  }

  private isReplanAllowed(kind: FailureKind): boolean {
    return kind === 'tool_blocked' || kind === 'missing_step' || kind === 'plan_validation_failed';
  }
}
