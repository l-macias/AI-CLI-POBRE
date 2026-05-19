import type { ModelBudgetDecision, ProviderUsageLedgerSummary } from './ModelBudgetTypes.js';
import type {
  ProviderSelectionAuditEntry,
  ProviderSelectionInput,
  ProviderSelectionResult,
} from './ProviderStrategyTypes.js';

export interface ProviderRuntimePolicyInput extends ProviderSelectionInput {
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
  premiumApproved?: boolean | undefined;
}

export interface ProviderRuntimePolicyDecision {
  allowed: boolean;
  selection: ProviderSelectionResult;
  budget: ModelBudgetDecision;
  auditLog: ProviderSelectionAuditEntry[];
}

export interface ProviderRuntimePolicySnapshot {
  auditLog: ProviderSelectionAuditEntry[];
  usageSummary: ProviderUsageLedgerSummary;
}
