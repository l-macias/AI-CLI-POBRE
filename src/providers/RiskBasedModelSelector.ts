import type {
  ModelTier,
  ProviderSelectionInput,
  RoleModelConfig,
} from '../types/ProviderStrategyTypes.js';

export class RiskBasedModelSelector {
  public select(input: { roleConfig: RoleModelConfig; request: ProviderSelectionInput }): {
    model: string;
    tier: ModelTier;
    reason: string;
    premiumSelected: boolean;
  } {
    const requestedModel = input.request.requestedModel?.trim();
    const requestAllowsPremium = input.request.allowPremium ?? false;

    if (requestedModel && requestedModel.length > 0) {
      return {
        model: requestedModel,
        tier: this.resolveRequestedTier(requestedModel, input.roleConfig.tier),
        reason: `Explicit requested model selected for role "${input.request.role}".`,
        premiumSelected: false,
      };
    }

    if (input.roleConfig.tier === 'premium' && !requestAllowsPremium) {
      const fallback = input.roleConfig.fallbackModels[0];

      if (fallback) {
        return {
          model: fallback,
          tier: 'cheap',
          reason: 'Premium model configured but request did not allow premium. Selected fallback.',
          premiumSelected: false,
        };
      }
    }

    if (
      input.request.riskLevel === 'high' &&
      input.roleConfig.allowPremium &&
      requestAllowsPremium
    ) {
      return {
        model: input.roleConfig.model,
        tier: input.roleConfig.tier,
        reason: 'High risk request allowed premium-capable role model.',
        premiumSelected: input.roleConfig.tier === 'premium',
      };
    }

    return {
      model: input.roleConfig.model,
      tier: input.roleConfig.tier,
      reason: `Default model selected for role "${input.request.role}".`,
      premiumSelected: input.roleConfig.tier === 'premium',
    };
  }

  private resolveRequestedTier(requestedModel: string, defaultTier: ModelTier): ModelTier {
    const normalized = requestedModel.toLowerCase();

    if (normalized.includes(':free')) {
      return 'free';
    }

    if (normalized.includes('mini') || normalized.includes('flash')) {
      return 'cheap';
    }

    if (
      normalized.includes('opus') ||
      normalized.includes('gpt-5') ||
      normalized.includes('premium')
    ) {
      return 'premium';
    }

    return defaultTier;
  }
}
