import type {
  ProviderPrecisionRequirement,
  ProviderProfile,
  ProviderTaskRole,
} from '../types/ProviderStrategyTypes.js';
import type { PlanRiskLevel } from '../types/PlanningTypes.js';
import type { ProviderRoutingDecision } from '../types/ProviderRuntimePolicyTypes.js';

export interface ModelRoutingPolicyInput {
  role: ProviderTaskRole;
  riskLevel: PlanRiskLevel;
  estimatedPromptTokens: number;
  estimatedCompletionTokens: number;
  requestedProfile?: ProviderProfile | undefined;
  requestedModel?: string | undefined;
  allowPremium?: boolean | undefined;
  precisionRequirement?: ProviderPrecisionRequirement | undefined;
}

const largeContextPromptThreshold = 6_000;
const veryLargeContextPromptThreshold = 10_000;
const largeCompletionThreshold = 1_500;

export class ModelRoutingPolicy {
  public route(input: ModelRoutingPolicyInput): ProviderRoutingDecision {
    const reasons: string[] = [];

    if (input.requestedModel && input.requestedModel.trim().length > 0) {
      reasons.push('Explicit requested model bypassed profile routing.');
      return {
        selectedProfile: null,
        reasons,
      };
    }

    if (input.requestedProfile) {
      reasons.push(`Explicit requested profile selected: ${input.requestedProfile}.`);
      return {
        selectedProfile: input.requestedProfile,
        reasons,
      };
    }

    const precisionRequirement = input.precisionRequirement ?? 'normal';
    const totalTokens = input.estimatedPromptTokens + input.estimatedCompletionTokens;

    if (
      input.allowPremium === true &&
      input.riskLevel === 'high' &&
      precisionRequirement === 'high'
    ) {
      reasons.push('High-risk task with high precision requirement can request premium profile.');
      reasons.push('Premium still requires budget approval gate before use.');
      return {
        selectedProfile: 'premium',
        reasons,
      };
    }

    if (
      input.riskLevel === 'high' ||
      precisionRequirement === 'high' ||
      input.estimatedPromptTokens >= largeContextPromptThreshold ||
      input.estimatedCompletionTokens >= largeCompletionThreshold
    ) {
      reasons.push(
        `Strong profile selected from risk/context/precision: risk=${input.riskLevel}, precision=${precisionRequirement}, totalTokens=${String(
          totalTokens,
        )}.`,
      );

      if (input.estimatedPromptTokens >= veryLargeContextPromptThreshold) {
        reasons.push('Context is very large; budget policy may still block this request.');
      }

      return {
        selectedProfile: 'strong',
        reasons,
      };
    }

    if (input.role === 'retriever' || input.role === 'repair') {
      reasons.push(`Free profile selected for low-cost ${input.role} role.`);
      return {
        selectedProfile: 'free',
        reasons,
      };
    }

    if (input.riskLevel === 'low' && precisionRequirement === 'low') {
      reasons.push('Free profile selected for low-risk low-precision task.');
      return {
        selectedProfile: 'free',
        reasons,
      };
    }

    reasons.push('Cheap profile selected as default non-premium routing choice.');

    return {
      selectedProfile: 'cheap',
      reasons,
    };
  }
}
