import type { ModelBudgetIssue } from '../types/ModelBudgetTypes.js';
import type { ProviderSelectionResult } from '../types/ProviderStrategyTypes.js';

export class PremiumApprovalGate {
  public check(input: {
    selection: ProviderSelectionResult;
    premiumApproved: boolean;
  }): ModelBudgetIssue[] {
    if (!input.selection.premiumSelected) {
      return [];
    }

    if (input.premiumApproved) {
      return [
        {
          code: 'PREMIUM_MODEL_APPROVED',
          message: `Premium model "${input.selection.model}" was explicitly approved.`,
          severity: 'info',
        },
      ];
    }

    return [
      {
        code: 'PREMIUM_APPROVAL_REQUIRED',
        message: `Premium model "${input.selection.model}" requires explicit approval.`,
        severity: 'error',
      },
    ];
  }
}
