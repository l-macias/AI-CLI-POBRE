import type { ProviderName } from './ProviderTypes.js';
import type { PlanRiskLevel } from './PlanningTypes.js';

export type ProviderTaskRole = 'planner' | 'retriever' | 'coder' | 'reviewer' | 'repair';

export type ModelTier = 'free' | 'cheap' | 'standard' | 'premium';

export type ProviderProfile = 'free' | 'cheap' | 'strong' | 'local' | 'premium';

export type ProviderPrecisionRequirement = 'low' | 'normal' | 'high';

export interface ProviderProfileConfig {
  profile: ProviderProfile;
  provider: ProviderName;
  model: string;
  tier: ModelTier;
  allowPremium: boolean;
  description: string;
  fallbackModels: string[];
}

export interface RoleModelConfig {
  role: ProviderTaskRole;
  provider: ProviderName;
  model: string;
  tier: ModelTier;
  fallbackModels: string[];
  allowPremium: boolean;
  preferredProfile?: ProviderProfile | undefined;
}

export interface ProviderStrategyConfig {
  defaultProvider: ProviderName;
  profiles?: ProviderProfileConfig[] | undefined;
  roles: RoleModelConfig[];
}

export interface ProviderSelectionInput {
  role: ProviderTaskRole;
  riskLevel: PlanRiskLevel;
  requestedModel?: string | undefined;
  requestedProfile?: ProviderProfile | undefined;
  allowPremium?: boolean | undefined;
  precisionRequirement?: ProviderPrecisionRequirement | undefined;
  routingReasons?: string[] | undefined;
}

export interface ProviderSelectionResult {
  role: ProviderTaskRole;
  provider: ProviderName;
  model: string;
  tier: ModelTier;
  profile?: ProviderProfile | undefined;
  fallbackModels: string[];
  reason: string;
  routingReasons?: string[] | undefined;
  premiumSelected: boolean;
  riskLevel: PlanRiskLevel;
  selectedAt: string;
}

export interface ProviderSelectionAuditEntry {
  role: ProviderTaskRole;
  provider: ProviderName;
  model: string;
  tier: ModelTier;
  profile?: ProviderProfile | undefined;
  riskLevel: PlanRiskLevel;
  premiumSelected: boolean;
  reason: string;
  routingReasons?: string[] | undefined;
  selectedAt: string;
}
