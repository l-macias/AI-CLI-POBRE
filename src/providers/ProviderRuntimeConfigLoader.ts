import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fromRoot } from '../utils/paths.js';
import type {
  ProviderRuntimeConfig,
  ProviderRuntimeConfigLoadResult,
} from '../types/ProviderRuntimeConfigTypes.js';
import { providerRuntimeConfigSchema } from './ProviderRuntimeConfigSchemas.js';
import { ProviderPolicy } from './ProviderPolicy.js';

export interface ProviderRuntimeConfigLoaderOptions {
  configPath?: string | undefined;
  fallbackDefaultModel?: string | undefined;
}

export class ProviderRuntimeConfigLoader {
  private readonly configPath: string;
  private readonly fallbackDefaultModel: string;

  public constructor(options: ProviderRuntimeConfigLoaderOptions = {}) {
    this.configPath = options.configPath ?? '.runtime/provider-runtime-config.json';
    this.fallbackDefaultModel = options.fallbackDefaultModel ?? 'openai/gpt-4o-mini';
  }

  public async load(): Promise<ProviderRuntimeConfigLoadResult> {
    const rawConfig = await this.readConfig();

    if (rawConfig === null) {
      return {
        config: this.createFallbackConfig(),
        source: 'fallback',
        issues: [
          {
            code: 'PROVIDER_RUNTIME_CONFIG_NOT_FOUND',
            message: 'Provider runtime config was not found. Using safe fallback config.',
            severity: 'warning',
          },
        ],
        loadedAt: new Date().toISOString(),
      };
    }

    try {
      const parsed = JSON.parse(rawConfig) as unknown;
      const validated = providerRuntimeConfigSchema.safeParse(parsed);

      if (!validated.success) {
        return {
          config: this.createFallbackConfig(),
          source: 'fallback',
          issues: [
            {
              code: 'PROVIDER_RUNTIME_CONFIG_INVALID',
              message: validated.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join('; '),
              severity: 'error',
            },
          ],
          loadedAt: new Date().toISOString(),
        };
      }

      return {
        config: validated.data,
        source: 'external',
        issues: [],
        loadedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        config: this.createFallbackConfig(),
        source: 'fallback',
        issues: [
          {
            code: 'PROVIDER_RUNTIME_CONFIG_PARSE_FAILED',
            message: error instanceof Error ? error.message : String(error),
            severity: 'error',
          },
        ],
        loadedAt: new Date().toISOString(),
      };
    }
  }

  private async readConfig(): Promise<string | null> {
    try {
      return await readFile(path.resolve(fromRoot(this.configPath)), 'utf8');
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  private createFallbackConfig(): ProviderRuntimeConfig {
    const policy = new ProviderPolicy();
    const providerStrategy = policy.createDefaultConfig(this.fallbackDefaultModel);

    return {
      providerStrategy,
      modelBudget: {
        tokenLimit: {
          maxPromptTokens: 8_000,
          maxCompletionTokens: 2_000,
          maxTotalTokens: 10_000,
        },
        costLimit: {
          maxEstimatedUsd: 0.05,
          maxSessionUsd: 1,
        },
        pricing: [
          {
            provider: 'openrouter',
            model: 'openai/gpt-oss-120b:free',
            tier: 'free',
            inputUsdPerMillionTokens: 0,
            outputUsdPerMillionTokens: 0,
          },
          {
            provider: 'openrouter',
            model: this.fallbackDefaultModel,
            tier: 'cheap',
            inputUsdPerMillionTokens: 0.15,
            outputUsdPerMillionTokens: 0.6,
          },
          {
            provider: 'openrouter',
            model: 'openai/gpt-5-premium',
            tier: 'premium',
            inputUsdPerMillionTokens: 2,
            outputUsdPerMillionTokens: 8,
          },
        ],
      },
    };
  }
}
