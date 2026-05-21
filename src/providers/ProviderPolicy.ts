import type {
  ProviderProfile,
  ProviderProfileConfig,
  ProviderStrategyConfig,
  ProviderTaskRole,
  RoleModelConfig,
} from '../types/ProviderStrategyTypes.js';

const freeModel = 'openai/gpt-oss-120b:free';
const cheapFallbackModel = 'openai/gpt-4o-mini';
const strongDefaultModel = 'openai/gpt-4o-mini';
const localPlaceholderModel = 'local/runtime-controlled-model';
const premiumPlaceholderModel = 'openai/gpt-5-premium';

export class ProviderPolicy {
  public createDefaultConfig(defaultModel: string): ProviderStrategyConfig {
    const cheapModel = defaultModel.trim().length > 0 ? defaultModel : cheapFallbackModel;

    return {
      defaultProvider: 'openrouter',
      profiles: this.createDefaultProfiles(cheapModel),
      roles: [
        {
          role: 'planner',
          provider: 'openrouter',
          model: cheapModel,
          tier: 'cheap',
          preferredProfile: 'cheap',
          fallbackModels: [freeModel],
          allowPremium: false,
        },
        {
          role: 'retriever',
          provider: 'openrouter',
          model: freeModel,
          tier: 'free',
          preferredProfile: 'free',
          fallbackModels: [cheapModel],
          allowPremium: false,
        },
        {
          role: 'coder',
          provider: 'openrouter',
          model: cheapModel,
          tier: 'cheap',
          preferredProfile: 'cheap',
          fallbackModels: [freeModel],
          allowPremium: false,
        },
        {
          role: 'reviewer',
          provider: 'openrouter',
          model: cheapModel,
          tier: 'cheap',
          preferredProfile: 'cheap',
          fallbackModels: [freeModel],
          allowPremium: false,
        },
        {
          role: 'repair',
          provider: 'openrouter',
          model: freeModel,
          tier: 'free',
          preferredProfile: 'free',
          fallbackModels: [cheapModel],
          allowPremium: false,
        },
      ],
    };
  }

  public createDefaultProfiles(defaultCheapModel: string): ProviderProfileConfig[] {
    return [
      {
        profile: 'free',
        provider: 'openrouter',
        model: freeModel,
        tier: 'free',
        allowPremium: false,
        description: 'Zero-cost profile for deterministic tests, retrieval, and low-risk repair.',
        fallbackModels: [defaultCheapModel],
      },
      {
        profile: 'cheap',
        provider: 'openrouter',
        model: defaultCheapModel,
        tier: 'cheap',
        allowPremium: false,
        description: 'Low-cost default profile for normal coding-agent tasks.',
        fallbackModels: [freeModel],
      },
      {
        profile: 'strong',
        provider: 'openrouter',
        model: strongDefaultModel,
        tier: 'standard',
        allowPremium: false,
        description: 'Higher-capability non-premium profile for complex review or coding tasks.',
        fallbackModels: [defaultCheapModel, freeModel],
      },
      {
        profile: 'local',
        provider: 'openrouter',
        model: localPlaceholderModel,
        tier: 'free',
        allowPremium: false,
        description:
          'Provider-agnostic local profile placeholder. Must be explicitly wired before real use.',
        fallbackModels: [freeModel],
      },
      {
        profile: 'premium',
        provider: 'openrouter',
        model: premiumPlaceholderModel,
        tier: 'premium',
        allowPremium: true,
        description: 'Premium profile. Never selected unless request and approval policy allow it.',
        fallbackModels: [strongDefaultModel, defaultCheapModel, freeModel],
      },
    ];
  }

  public getRoleConfig(config: ProviderStrategyConfig, role: ProviderTaskRole): RoleModelConfig {
    const roleConfig = config.roles.find((item) => item.role === role);

    if (!roleConfig) {
      throw new Error(`Provider role "${role}" is not configured.`);
    }

    return roleConfig;
  }

  public getProfileConfig(
    config: ProviderStrategyConfig,
    profile: ProviderProfile,
  ): ProviderProfileConfig | null {
    return config.profiles?.find((item) => item.profile === profile) ?? null;
  }
}
