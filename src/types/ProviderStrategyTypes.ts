import type { ProviderName } from './ProviderTypes.js';
import type { PlanRiskLevel } from './PlanningTypes.js';

export type ProviderTaskRole = 'planner' | 'retriever' | 'coder' | 'reviewer' | 'repair';

export type ModelTier = 'free' | 'cheap' | 'standard' | 'premium';

export interface RoleModelConfig {
  role: ProviderTaskRole;
  provider: ProviderName;
  model: string;
  tier: ModelTier;
  fallbackModels: string[];
  allowPremium: boolean;
}

export interface ProviderStrategyConfig {
  defaultProvider: ProviderName;
  roles: RoleModelConfig[];
}

export interface ProviderSelectionInput {
  role: ProviderTaskRole;
  riskLevel: PlanRiskLevel;
  requestedModel?: string | undefined;
  allowPremium?: boolean | undefined;
}

export interface ProviderSelectionResult {
  role: ProviderTaskRole;
  provider: ProviderName;
  model: string;
  tier: ModelTier;
  fallbackModels: string[];
  reason: string;
  premiumSelected: boolean;
  riskLevel: PlanRiskLevel;
  selectedAt: string;
}

export interface ProviderSelectionAuditEntry {
  role: ProviderTaskRole;
  provider: ProviderName;
  model: string;
  tier: ModelTier;
  riskLevel: PlanRiskLevel;
  premiumSelected: boolean;
  reason: string;
  selectedAt: string;
}
