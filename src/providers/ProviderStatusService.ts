import type {
  ProviderStatus,
  ProviderStatusReport,
  RuntimeModelOption,
  RuntimeProviderName,
} from './ProviderStatus.js';

export interface ProviderStatusServiceOptions {
  env?: NodeJS.ProcessEnv | undefined;
  activeProvider?: RuntimeProviderName | undefined;
  activeModel?: string | undefined;
}

export class ProviderStatusService {
  private readonly env: NodeJS.ProcessEnv;
  private readonly activeProvider: RuntimeProviderName;
  private readonly activeModel: string;

  public constructor(options: ProviderStatusServiceOptions = {}) {
    this.env = options.env ?? process.env;
    this.activeProvider = options.activeProvider ?? 'openrouter';
    this.activeModel = options.activeModel ?? 'poolside/laguna-xs.2:free';
  }

  public getStatus(): ProviderStatusReport {
    const providers: ProviderStatus[] = [
      this.openRouterStatus(),
      this.mockStatus(),
      this.localStatus(),
    ];

    return {
      providers,
      activeProvider: this.activeProvider,
      activeModel: this.activeModel,
      generatedAt: new Date().toISOString(),
    };
  }

  private openRouterStatus(): ProviderStatus {
    const apiKeyPresent = this.hasValue(this.env['OPENROUTER_API_KEY']);

    return {
      provider: 'openrouter',
      configured: apiKeyPresent,
      apiKeyPresent,
      apiKeySource: apiKeyPresent ? 'env' : 'missing',
      models: this.openRouterModels(),
      defaultModel: 'poolside/laguna-xs.2:free',
      generatedAt: new Date().toISOString(),
    };
  }

  private mockStatus(): ProviderStatus {
    return {
      provider: 'mock',
      configured: true,
      apiKeyPresent: false,
      apiKeySource: 'missing',
      models: [
        {
          id: 'mock/fake-provider',
          label: 'Mock Fake Provider',
          provider: 'mock',
          free: true,
          recommended: true,
          description: 'Local fake provider for deterministic runtime tests.',
        },
      ],
      defaultModel: 'mock/fake-provider',
      generatedAt: new Date().toISOString(),
    };
  }

  private localStatus(): ProviderStatus {
    return {
      provider: 'local',
      configured: false,
      apiKeyPresent: false,
      apiKeySource: 'missing',
      models: [],
      defaultModel: '',
      generatedAt: new Date().toISOString(),
    };
  }

  private openRouterModels(): RuntimeModelOption[] {
    return [
      {
        id: 'poolside/laguna-xs.2:free',
        label: 'Poolside Laguna XS 2 Free',
        provider: 'openrouter',
        free: true,
        recommended: true,
        description: 'Free OpenRouter test model currently used for Zero Runtime experiments.',
      },
      {
        id: 'google/gemma-3-27b-it:free',
        label: 'Google Gemma 3 27B IT Free',
        provider: 'openrouter',
        free: true,
        recommended: false,
        description: 'Free instruction model option for low-cost tests.',
      },
      {
        id: 'meta-llama/llama-3.1-8b-instruct:free',
        label: 'Llama 3.1 8B Instruct Free',
        provider: 'openrouter',
        free: true,
        recommended: false,
        description: 'Small free instruction model option.',
      },
      {
        id: 'openai/gpt-4.1-mini',
        label: 'OpenAI GPT-4.1 Mini',
        provider: 'openrouter',
        free: false,
        recommended: false,
        description: 'Paid stronger coding/general model option through OpenRouter.',
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        label: 'Claude 3.5 Sonnet',
        provider: 'openrouter',
        free: false,
        recommended: false,
        description: 'Paid reasoning/coding model option through OpenRouter.',
      },
    ];
  }

  private hasValue(value: string | undefined): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
