import type {
  RepairProposalProvider,
  RepairProposalProviderResult,
} from './RepairProposalProvider.js';
import { RepairModelPolicy } from './RepairModelPolicy.js';
import { RepairProviderFallback } from './RepairProviderFallback.js';
import type { RepairRequest, RepairRiskLevel } from '../types/RepairTypes.js';
import type { RepairModelPolicyProvider } from '../types/RepairModelPolicyTypes.js';

export interface PolicyAwareRepairProposalProviderOptions {
  provider: RepairModelPolicyProvider;
  primary: RepairProposalProvider;
  fallback: RepairProposalProvider;
  policy?: RepairModelPolicy | undefined;
  fallbackResolver?: RepairProviderFallback | undefined;
  requestedModel?: string | undefined;
  estimatedCompletionTokens?: number | undefined;
  allowPremium?: boolean | undefined;
  premiumApproved?: boolean | undefined;
}

export class PolicyAwareRepairProposalProvider implements RepairProposalProvider {
  private readonly provider: RepairModelPolicyProvider;
  private readonly primary: RepairProposalProvider;
  private readonly fallback: RepairProposalProvider;
  private readonly policy: RepairModelPolicy;
  private readonly fallbackResolver: RepairProviderFallback;
  private readonly requestedModel?: string | undefined;
  private readonly estimatedCompletionTokens?: number | undefined;
  private readonly allowPremium?: boolean | undefined;
  private readonly premiumApproved?: boolean | undefined;

  public constructor(options: PolicyAwareRepairProposalProviderOptions) {
    this.provider = options.provider;
    this.primary = options.primary;
    this.fallback = options.fallback;
    this.policy = options.policy ?? new RepairModelPolicy();
    this.fallbackResolver = options.fallbackResolver ?? new RepairProviderFallback();
    this.requestedModel = options.requestedModel;
    this.estimatedCompletionTokens = options.estimatedCompletionTokens;
    this.allowPremium = options.allowPremium;
    this.premiumApproved = options.premiumApproved;
  }

  public async propose(input: {
    request: RepairRequest;
    prompt: string;
  }): Promise<RepairProposalProviderResult> {
    const decision = this.policy.evaluate({
      provider: this.provider,
      prompt: input.prompt,
      riskLevel: this.resolveRiskLevel(input.request),
      requestedModel: this.requestedModel,
      estimatedCompletionTokens: this.estimatedCompletionTokens,
      allowPremium: this.allowPremium,
      premiumApproved: this.premiumApproved,
    });

    const selected = this.fallbackResolver.resolve({
      primary: this.primary,
      fallback: this.fallback,
      policyDecision: decision,
    });

    const result = await selected.provider.propose(input);

    return {
      ...result,
      modelPolicyDecision: decision,
      providerFallbackUsed: selected.fallbackUsed,
      providerFallbackReason: selected.reason,
    };
  }

  private resolveRiskLevel(request: RepairRequest): RepairRiskLevel {
    if (request.findings.some((finding) => finding.severity === 'error')) {
      return 'medium';
    }

    if (request.findings.some((finding) => finding.severity === 'warning')) {
      return 'medium';
    }

    return 'low';
  }
}
