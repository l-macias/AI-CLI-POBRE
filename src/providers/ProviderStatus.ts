export type RuntimeProviderName = 'openrouter' | 'local' | 'mock';

export interface RuntimeModelOption {
  id: string;
  label: string;
  provider: RuntimeProviderName;
  free: boolean;
  recommended: boolean;
  description: string;
}

export interface ProviderStatus {
  provider: RuntimeProviderName;
  configured: boolean;
  apiKeyPresent: boolean;
  apiKeySource: 'env' | 'missing';
  models: RuntimeModelOption[];
  defaultModel: string;
  generatedAt: string;
}

export interface ProviderStatusReport {
  providers: ProviderStatus[];
  activeProvider: RuntimeProviderName;
  activeModel: string;
  generatedAt: string;
}
