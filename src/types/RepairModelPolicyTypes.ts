import type { RepairRiskLevel } from './RepairTypes.js';

export type RepairModelPolicyProvider = 'fake-llm' | 'static' | 'openrouter';

export type RepairModelPolicyDecisionStatus = 'allowed' | 'blocked' | 'warning';

export interface RepairCostEstimate {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedUsd: number;
  pricingKnown: boolean;
}

export interface RepairModelPolicyInput {
  provider: RepairModelPolicyProvider;
  prompt: string;
  riskLevel: RepairRiskLevel;
  requestedModel?: string | undefined;
  estimatedCompletionTokens?: number | undefined;
  allowPremium?: boolean | undefined;
  premiumApproved?: boolean | undefined;
}

export interface RepairModelPolicyIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface RepairModelPolicyDecision {
  allowed: boolean;
  status: RepairModelPolicyDecisionStatus;
  provider: RepairModelPolicyProvider;
  selectedProvider: string;
  selectedModel: string;
  estimate: RepairCostEstimate;
  requiresPremiumApproval: boolean;
  issues: RepairModelPolicyIssue[];
  checkedAt: string;
}
