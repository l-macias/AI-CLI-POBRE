import type {
  ModelTier,
  ProviderProfile,
  ProviderProfileConfig,
  ProviderSelectionInput,
  RoleModelConfig,
} from '../types/ProviderStrategyTypes.js';

export class RiskBasedModelSelector {
  public select(input: {
    roleConfig: RoleModelConfig;
    request: ProviderSelectionInput;
    requestedProfileConfig?: ProviderProfileConfig | undefined;
    preferredProfileConfig?: ProviderProfileConfig | undefined;
  }): {
    model: string;
    tier: ModelTier;
    profile?: ProviderProfile | undefined;
    reason: string;
    premiumSelected: boolean;
  } {
    const requestedModel = input.request.requestedModel?.trim();
    const requestAllowsPremium = input.request.allowPremium ?? false;

    if (requestedModel && requestedModel.length > 0) {
      const tier = this.resolveRequestedTier(requestedModel, input.roleConfig.tier);

      return {
        model: requestedModel,
        tier,
        profile: input.request.requestedProfile ?? input.roleConfig.preferredProfile,
        reason: `Explicit requested model selected for role "${input.request.role}".`,
        premiumSelected: tier === 'premium',
      };
    }

    if (input.requestedProfileConfig) {
      return this.selectProfile({
        role: input.request.role,
        profileConfig: input.requestedProfileConfig,
        requestAllowsPremium,
        explicitProfile: true,
      });
    }

    if (input.preferredProfileConfig) {
      return this.selectProfile({
        role: input.request.role,
        profileConfig: input.preferredProfileConfig,
        requestAllowsPremium,
        explicitProfile: false,
      });
    }

    if (input.roleConfig.tier === 'premium' && !requestAllowsPremium) {
      const fallback = input.roleConfig.fallbackModels[0];

      if (fallback) {
        const tier = this.resolveRequestedTier(fallback, 'cheap');

        return {
          model: fallback,
          tier,
          profile: input.roleConfig.preferredProfile,
          reason: 'Premium model configured but request did not allow premium. Selected fallback.',
          premiumSelected: tier === 'premium',
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
        profile: input.roleConfig.preferredProfile,
        reason: 'High risk request allowed premium-capable role model.',
        premiumSelected: input.roleConfig.tier === 'premium',
      };
    }

    return {
      model: input.roleConfig.model,
      tier: input.roleConfig.tier,
      profile: input.roleConfig.preferredProfile,
      reason: `Default model selected for role "${input.request.role}".`,
      premiumSelected: input.roleConfig.tier === 'premium',
    };
  }

  private selectProfile(input: {
    role: string;
    profileConfig: ProviderProfileConfig;
    requestAllowsPremium: boolean;
    explicitProfile: boolean;
  }): {
    model: string;
    tier: ModelTier;
    profile: ProviderProfile;
    reason: string;
    premiumSelected: boolean;
  } {
    if (input.profileConfig.tier === 'premium' && !input.requestAllowsPremium) {
      const fallback = input.profileConfig.fallbackModels[0];

      if (fallback) {
        const tier = this.resolveRequestedTier(fallback, 'cheap');

        return {
          model: fallback,
          tier,
          profile: input.profileConfig.profile,
          reason: `${input.explicitProfile ? 'Requested' : 'Preferred'} premium profile for role "${
            input.role
          }" was blocked because premium was not allowed. Selected fallback.`,
          premiumSelected: tier === 'premium',
        };
      }
    }

    return {
      model: input.profileConfig.model,
      tier: input.profileConfig.tier,
      profile: input.profileConfig.profile,
      reason: `${input.explicitProfile ? 'Requested' : 'Preferred'} provider profile "${
        input.profileConfig.profile
      }" selected for role "${input.role}".`,
      premiumSelected: input.profileConfig.tier === 'premium',
    };
  }

  private resolveRequestedTier(requestedModel: string, defaultTier: ModelTier): ModelTier {
    const normalized = requestedModel.toLowerCase();

    if (normalized.includes(':free') || normalized.includes('local/')) {
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
