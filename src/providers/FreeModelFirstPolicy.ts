import type { ModelBudgetIssue } from '../types/ModelBudgetTypes.js';
import type { ProviderSelectionResult } from '../types/ProviderStrategyTypes.js';

export class FreeModelFirstPolicy {
  public check(selection: ProviderSelectionResult): ModelBudgetIssue[] {
    if (selection.tier === 'free') {
      return [
        {
          code: 'FREE_MODEL_SELECTED',
          message: `Free model selected for role "${selection.role}".`,
          severity: 'info',
        },
      ];
    }

    if (selection.fallbackModels.some((model) => model.includes(':free'))) {
      return [
        {
          code: 'FREE_FALLBACK_AVAILABLE',
          message: 'A free fallback exists. Runtime should prefer it when quality/risk allows.',
          severity: 'warning',
        },
      ];
    }

    return [];
  }
}
