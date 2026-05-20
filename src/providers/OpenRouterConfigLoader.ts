import type { OpenRouterConfig, OpenRouterConfigLoaderInput } from './OpenRouterTypes.js';
import type { Result } from '../types/SharedTypes.js';

const defaultOpenRouterBaseUrl = 'https://openrouter.ai/api/v1';
const defaultTimeoutMs = 30_000;
const defaultMaxTokens = 1_200;

export class OpenRouterConfigLoader {
  public load(input: OpenRouterConfigLoaderInput = {}): Result<OpenRouterConfig> {
    const env = input.env ?? process.env;
    const requireApiKey = input.requireApiKey ?? true;
    const requireExplicitOptIn = input.requireExplicitOptIn ?? true;

    const enabled = this.parseEnabled(env['ZERO_OPENROUTER_ENABLED']);

    if (requireExplicitOptIn && !enabled) {
      return {
        ok: false,
        error: new Error(
          'OpenRouter provider is not enabled. Set ZERO_OPENROUTER_ENABLED=1 or pass explicit provider opt-in from the caller.',
        ),
      };
    }

    const apiKey = this.normalizeOptionalString(env['OPENROUTER_API_KEY']);

    if (requireApiKey && !apiKey) {
      return {
        ok: false,
        error: new Error('OpenRouter API key is required but was not provided.'),
      };
    }

    if (apiKey && !this.looksLikeSafeApiKey(apiKey)) {
      return {
        ok: false,
        error: new Error('OpenRouter API key is present but has an invalid format.'),
      };
    }

    const baseUrl =
      this.normalizeOptionalString(env['OPENROUTER_BASE_URL']) ??
      input.defaultBaseUrl ??
      defaultOpenRouterBaseUrl;

    const model =
      this.normalizeOptionalString(env['ZERO_OPENROUTER_MODEL']) ??
      this.normalizeOptionalString(env['OPENROUTER_DEFAULT_MODEL']) ??
      input.defaultModel;

    if (!model) {
      return {
        ok: false,
        error: new Error(
          'OpenRouter model is required. Provide ZERO_OPENROUTER_MODEL, OPENROUTER_DEFAULT_MODEL, or inject defaultModel from provider strategy.',
        ),
      };
    }

    const timeoutMs = this.parsePositiveInteger({
      value: env['ZERO_OPENROUTER_TIMEOUT_MS'],
      fallback: input.defaultTimeoutMs ?? defaultTimeoutMs,
      fieldName: 'ZERO_OPENROUTER_TIMEOUT_MS',
    });

    if (!timeoutMs.ok) {
      return timeoutMs;
    }

    const maxTokens = this.parsePositiveInteger({
      value: env['ZERO_OPENROUTER_MAX_TOKENS'],
      fallback: input.defaultMaxTokens ?? defaultMaxTokens,
      fieldName: 'ZERO_OPENROUTER_MAX_TOKENS',
    });

    if (!maxTokens.ok) {
      return maxTokens;
    }

    const normalizedBaseUrl = this.normalizeBaseUrl(baseUrl);

    if (!normalizedBaseUrl.ok) {
      return normalizedBaseUrl;
    }

    return {
      ok: true,
      value: {
        provider: 'openrouter',
        enabled,
        apiKey: apiKey ?? '',
        baseUrl: normalizedBaseUrl.value,
        defaultModel: model,
        timeoutMs: timeoutMs.value,
        maxTokens: maxTokens.value,
        httpReferer: this.normalizeOptionalString(env['OPENROUTER_HTTP_REFERER']),
        appTitle: this.normalizeOptionalString(env['OPENROUTER_APP_TITLE']),
      },
    };
  }

  public redacted(config: OpenRouterConfig): Omit<OpenRouterConfig, 'apiKey'> & {
    apiKey: '[redacted]';
  } {
    return {
      ...config,
      apiKey: '[redacted]',
    };
  }

  private parseEnabled(value: string | undefined): boolean {
    const normalized = value?.trim().toLowerCase();

    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }

  private normalizeOptionalString(value: string | undefined): string | undefined {
    const normalized = value?.trim();

    if (!normalized) {
      return undefined;
    }

    return normalized;
  }

  private looksLikeSafeApiKey(value: string): boolean {
    if (value.length < 12) {
      return false;
    }

    if (/\s/.test(value)) {
      return false;
    }

    return true;
  }

  private parsePositiveInteger(input: {
    value: string | undefined;
    fallback: number;
    fieldName: string;
  }): Result<number> {
    const raw = this.normalizeOptionalString(input.value);

    if (!raw) {
      return {
        ok: true,
        value: input.fallback,
      };
    }

    const parsed = Number(raw);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      return {
        ok: false,
        error: new Error(`${input.fieldName} must be a positive integer.`),
      };
    }

    return {
      ok: true,
      value: parsed,
    };
  }

  private normalizeBaseUrl(value: string): Result<string> {
    try {
      const url = new URL(value);

      if (url.protocol !== 'https:') {
        return {
          ok: false,
          error: new Error('OpenRouter base URL must use https.'),
        };
      }

      return {
        ok: true,
        value: url.toString().replace(/\/$/, ''),
      };
    } catch {
      return {
        ok: false,
        error: new Error('OpenRouter base URL is invalid.'),
      };
    }
  }
}
