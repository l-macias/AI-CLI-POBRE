import type {
  GuardrailInput,
  GuardrailIssue,
  GuardrailResult,
  RuntimeGuardrail,
} from '../types/GuardrailTypes.js';

export class ContextOverflowGuard implements RuntimeGuardrail {
  public readonly kind = 'context_overflow' as const;

  public validate(input: GuardrailInput): GuardrailResult {
    const issues: GuardrailIssue[] = [];

    if (input.estimatedContextTokens === undefined || input.maxContextTokens === undefined) {
      return {
        guardrail: this.kind,
        status: 'passed',
        issues,
      };
    }

    if (input.estimatedContextTokens > input.maxContextTokens) {
      issues.push({
        code: 'CONTEXT_LIMIT_EXCEEDED',
        message: `Estimated context tokens ${String(
          input.estimatedContextTokens,
        )} exceed limit ${String(input.maxContextTokens)}.`,
        severity: 'error',
        guardrail: this.kind,
      });
    }

    return {
      guardrail: this.kind,
      status: issues.length === 0 ? 'passed' : 'blocked',
      issues,
    };
  }
}
