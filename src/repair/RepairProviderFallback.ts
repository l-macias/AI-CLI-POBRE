import type {
  RepairModelPolicyDecision,
  RepairModelPolicyIssue,
} from '../types/RepairModelPolicyTypes.js';
import type { RepairProposalProvider } from './RepairProposalProvider.js';

export interface RepairProviderFallbackInput {
  primary: RepairProposalProvider;
  fallback: RepairProposalProvider;
  policyDecision: RepairModelPolicyDecision;
}

export interface RepairProviderFallbackResult {
  provider: RepairProposalProvider;
  fallbackUsed: boolean;
  reason: string;
}

export class RepairProviderFallback {
  public resolve(input: RepairProviderFallbackInput): RepairProviderFallbackResult {
    if (input.policyDecision.allowed) {
      return {
        provider: input.primary,
        fallbackUsed: false,
        reason: 'Primary repair provider allowed by model policy.',
      };
    }

    return {
      provider: input.fallback,
      fallbackUsed: true,
      reason: `Primary repair provider blocked by model policy: ${this.formatIssues(
        input.policyDecision.issues,
      )}`,
    };
  }

  private formatIssues(issues: readonly RepairModelPolicyIssue[]): string {
    if (issues.length === 0) {
      return 'unknown policy issue';
    }

    return issues.map((issue) => `${issue.code}: ${issue.message}`).join('; ');
  }
}
