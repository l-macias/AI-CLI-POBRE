import type { CostBudgetLimit, ModelPricing, TokenBudgetLimit } from './ModelBudgetTypes.js';
import type { ProviderStrategyConfig } from './ProviderStrategyTypes.js';

export interface ProviderRuntimeConfig {
  providerStrategy: ProviderStrategyConfig;
  modelBudget: ProviderModelBudgetConfig;
}

export interface ProviderModelBudgetConfig {
  tokenLimit: TokenBudgetLimit;
  costLimit: CostBudgetLimit;
  pricing: ModelPricing[];
}

export interface ProviderRuntimeConfigLoadResult {
  config: ProviderRuntimeConfig;
  source: 'external' | 'fallback';
  issues: ProviderRuntimeConfigIssue[];
  loadedAt: string;
}

export interface ProviderRuntimeConfigIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}
