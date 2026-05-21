import type { ModelBudgetDecision, ProviderUsageLedgerSummary } from './ModelBudgetTypes.js';
import type {
  ProviderPrecisionRequirement,
  ProviderProfile,
  ProviderSelectionAuditEntry,
  ProviderSelectionInput,
  ProviderSelectionResult,
} from './ProviderStrategyTypes.js';

export interface ProviderRuntimePolicyInput extends ProviderSelectionInput {
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
  premiumApproved?: boolean | undefined;
  precisionRequirement?: ProviderPrecisionRequirement | undefined;
}

export interface ProviderRoutingDecision {
  selectedProfile: ProviderProfile | null;
  reasons: string[];
}

export interface ProviderFallbackEvaluationAttempt {
  model: string;
  selected: boolean;
  allowed: boolean;
  skipped: boolean;
  reason: string;
}

export interface ProviderFallbackDecision {
  used: boolean;
  originalModel: string;
  selectedModel: string;
  reason: string;
  attempts: ProviderFallbackEvaluationAttempt[];
}

export interface ProviderRuntimePolicyDecision {
  allowed: boolean;
  selection: ProviderSelectionResult;
  routing: ProviderRoutingDecision;
  budget: ModelBudgetDecision;
  fallback: ProviderFallbackDecision;
  auditLog: ProviderSelectionAuditEntry[];
}

export interface ProviderRuntimePolicySnapshot {
  auditLog: ProviderSelectionAuditEntry[];
  usageSummary: ProviderUsageLedgerSummary;
}
