import type {
  ProviderStrategyConfig,
  ProviderTaskRole,
  RoleModelConfig,
} from '../types/ProviderStrategyTypes.js';

export class ProviderPolicy {
  public createDefaultConfig(defaultModel: string): ProviderStrategyConfig {
    return {
      defaultProvider: 'openrouter',
      roles: [
        {
          role: 'planner',
          provider: 'openrouter',
          model: defaultModel,
          tier: 'cheap',
          fallbackModels: ['openai/gpt-oss-120b:free'],
          allowPremium: false,
        },
        {
          role: 'retriever',
          provider: 'openrouter',
          model: 'openai/gpt-oss-120b:free',
          tier: 'free',
          fallbackModels: [defaultModel],
          allowPremium: false,
        },
        {
          role: 'coder',
          provider: 'openrouter',
          model: defaultModel,
          tier: 'cheap',
          fallbackModels: ['openai/gpt-oss-120b:free'],
          allowPremium: false,
        },
        {
          role: 'reviewer',
          provider: 'openrouter',
          model: defaultModel,
          tier: 'cheap',
          fallbackModels: ['openai/gpt-oss-120b:free'],
          allowPremium: false,
        },
        {
          role: 'repair',
          provider: 'openrouter',
          model: 'openai/gpt-oss-120b:free',
          tier: 'free',
          fallbackModels: [defaultModel],
          allowPremium: false,
        },
      ],
    };
  }

  public getRoleConfig(config: ProviderStrategyConfig, role: ProviderTaskRole): RoleModelConfig {
    const roleConfig = config.roles.find((item) => item.role === role);

    if (!roleConfig) {
      throw new Error(`Provider role "${role}" is not configured.`);
    }

    return roleConfig;
  }
}
