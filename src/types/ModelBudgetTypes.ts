import type {
  ModelTier,
  ProviderSelectionResult,
  ProviderTaskRole,
} from './ProviderStrategyTypes.js';
import type { ProviderName, ProviderUsage } from './ProviderTypes.js';

export interface TokenBudgetLimit {
  maxPromptTokens: number;
  maxCompletionTokens: number;
  maxTotalTokens: number;
}

export interface CostBudgetLimit {
  maxEstimatedUsd: number;
  maxSessionUsd: number;
}

export interface ModelPricing {
  provider: ProviderName;
  model: string;
  tier: ModelTier;
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

export interface ModelCostEstimateInput {
  provider: ProviderName;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export interface ModelCostEstimate {
  provider: ProviderName;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedUsd: number;
  pricingKnown: boolean;
}

export interface ModelBudgetCheckInput {
  selection: ProviderSelectionResult;
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
  premiumApproved?: boolean | undefined;
}

export interface ModelBudgetIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ModelBudgetDecision {
  allowed: boolean;
  requiresPremiumApproval: boolean;
  selection: ProviderSelectionResult;
  estimatedCost: ModelCostEstimate;
  issues: ModelBudgetIssue[];
  checkedAt: string;
}

export interface ProviderUsageLedgerEntry {
  provider: ProviderName;
  model: string;
  role: ProviderTaskRole;
  tier: ModelTier;
  usage: ProviderUsage;
  estimatedUsd: number;
  reason: string;
  recordedAt: string;
}

export interface ProviderUsageLedgerSummary {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalEstimatedUsd: number;
  entries: ProviderUsageLedgerEntry[];
}
