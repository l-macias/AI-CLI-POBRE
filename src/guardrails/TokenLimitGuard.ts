import type {
  GuardrailInput,
  GuardrailIssue,
  GuardrailResult,
  RuntimeGuardrail,
} from '../types/GuardrailTypes.js';

export class TokenLimitGuard implements RuntimeGuardrail {
  public readonly kind = 'token_limit' as const;

  public validate(input: GuardrailInput): GuardrailResult {
    const issues: GuardrailIssue[] = [];

    if (input.estimatedTokens === undefined || input.maxTokens === undefined) {
      return {
        guardrail: this.kind,
        status: 'passed',
        issues,
      };
    }

    if (input.estimatedTokens > input.maxTokens) {
      issues.push({
        code: 'TOKEN_LIMIT_EXCEEDED',
        message: `Estimated tokens ${String(input.estimatedTokens)} exceed limit ${String(
          input.maxTokens,
        )}.`,
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
