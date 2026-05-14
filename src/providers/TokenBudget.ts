import type { ModelBudgetIssue, TokenBudgetLimit } from '../types/ModelBudgetTypes.js';

export class TokenBudget {
  private readonly limit: TokenBudgetLimit;

  public constructor(limit: TokenBudgetLimit) {
    this.limit = limit;
  }

  public check(input: { promptTokens: number; completionTokens: number }): ModelBudgetIssue[] {
    const totalTokens = input.promptTokens + input.completionTokens;
    const issues: ModelBudgetIssue[] = [];

    if (input.promptTokens > this.limit.maxPromptTokens) {
      issues.push({
        code: 'PROMPT_TOKEN_BUDGET_EXCEEDED',
        message: `Estimated prompt tokens ${String(input.promptTokens)} exceed limit ${String(
          this.limit.maxPromptTokens,
        )}.`,
        severity: 'error',
      });
    }

    if (input.completionTokens > this.limit.maxCompletionTokens) {
      issues.push({
        code: 'COMPLETION_TOKEN_BUDGET_EXCEEDED',
        message: `Estimated completion tokens ${String(
          input.completionTokens,
        )} exceed limit ${String(this.limit.maxCompletionTokens)}.`,
        severity: 'error',
      });
    }

    if (totalTokens > this.limit.maxTotalTokens) {
      issues.push({
        code: 'TOTAL_TOKEN_BUDGET_EXCEEDED',
        message: `Estimated total tokens ${String(totalTokens)} exceed limit ${String(
          this.limit.maxTotalTokens,
        )}.`,
        severity: 'error',
      });
    }

    return issues;
  }
}
