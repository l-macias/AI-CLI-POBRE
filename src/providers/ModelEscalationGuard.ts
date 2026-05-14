import type { ModelBudgetIssue } from '../types/ModelBudgetTypes.js';
import type { ProviderSelectionResult } from '../types/ProviderStrategyTypes.js';

export class ModelEscalationGuard {
  public check(selection: ProviderSelectionResult): ModelBudgetIssue[] {
    if (!selection.premiumSelected) {
      return [];
    }

    if (selection.riskLevel !== 'high') {
      return [
        {
          code: 'PREMIUM_ESCALATION_RISK_TOO_LOW',
          message: 'Premium escalation is only allowed for high-risk tasks with explicit approval.',
          severity: 'error',
        },
      ];
    }

    return [
      {
        code: 'PREMIUM_ESCALATION_RISK_ACCEPTED',
        message: 'Premium escalation risk check passed.',
        severity: 'info',
      },
    ];
  }
}
