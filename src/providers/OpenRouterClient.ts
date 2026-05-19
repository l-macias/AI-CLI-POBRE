import type {
  OpenRouterChatCompletionBody,
  OpenRouterChatCompletionInput,
  OpenRouterClientOptions,
  OpenRouterClientResult,
  OpenRouterFetcher,
  OpenRouterHttpResponse,
} from './OpenRouterTypes.js';
import { ProviderErrorMapper } from './ProviderErrorMapper.js';
import { ProviderTimeoutPolicy } from './ProviderTimeoutPolicy.js';
import { safeJsonParse } from '../utils/safeJson.js';

export interface OpenRouterClientDependencies {
  timeoutPolicy?: ProviderTimeoutPolicy | undefined;
  errorMapper?: ProviderErrorMapper | undefined;
}

export class OpenRouterClient {
  private readonly options: OpenRouterClientOptions;
  private readonly fetcher: OpenRouterFetcher;
  private readonly timeoutPolicy: ProviderTimeoutPolicy;
  private readonly errorMapper: ProviderErrorMapper;

  public constructor(
    options: OpenRouterClientOptions,
    dependencies: OpenRouterClientDependencies = {},
  ) {
    this.options = options;
    this.fetcher = options.fetcher ?? this.createDefaultFetcher();
    this.timeoutPolicy = dependencies.timeoutPolicy ?? new ProviderTimeoutPolicy();
    this.errorMapper = dependencies.errorMapper ?? new ProviderErrorMapper();
  }

  public async createChatCompletion(
    input: OpenRouterChatCompletionInput,
  ): Promise<OpenRouterClientResult> {
    const validation = this.validateInput(input);

    if (!validation.ok) {
      return validation;
    }

    const timeout = this.timeoutPolicy.create(this.options.config.timeoutMs);

    try {
      const response = await this.fetcher(this.buildChatCompletionsUrl(), {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildBody(input)),
        signal: timeout.signal,
      });

      return await this.mapResponse(response);
    } catch (error) {
      if (this.timeoutPolicy.isTimeoutError(error)) {
        return {
          ok: false,
          error: this.timeoutPolicy.toTimeoutError(),
        };
      }

      return {
        ok: false,
        error: this.errorMapper.mapNetworkError(error),
      };
    } finally {
      timeout.clear();
    }
  }

  private validateInput(input: OpenRouterChatCompletionInput): OpenRouterClientResult {
    if (!this.options.config.enabled) {
      return {
        ok: false,
        error: {
          code: 'OPENROUTER_NOT_ENABLED',
          message: 'OpenRouter provider is not enabled.',
          retryable: false,
        },
      };
    }

    if (!this.options.config.apiKey) {
      return {
        ok: false,
        error: {
          code: 'OPENROUTER_API_KEY_MISSING',
          message: 'OpenRouter API key is missing.',
          retryable: false,
        },
      };
    }

    const model = input.model ?? this.options.config.defaultModel;

    if (!model.trim()) {
      return {
        ok: false,
        error: {
          code: 'OPENROUTER_MODEL_MISSING',
          message: 'OpenRouter model is missing.',
          retryable: false,
        },
      };
    }

    if (input.messages.length === 0) {
      return {
        ok: false,
        error: {
          code: 'OPENROUTER_CONFIG_INVALID',
          message: 'OpenRouter request must include at least one message.',
          retryable: false,
        },
      };
    }

    const invalidMessage = input.messages.find((message) => {
      return !message.content.trim();
    });

    if (invalidMessage) {
      return {
        ok: false,
        error: {
          code: 'OPENROUTER_CONFIG_INVALID',
          message: 'OpenRouter messages must not contain empty content.',
          retryable: false,
        },
      };
    }

    return {
      ok: true,
      value: {
        statusCode: 0,
        rawBody: '',
        json: {},
      },
    };
  }

  private buildChatCompletionsUrl(): string {
    return `${this.options.config.baseUrl}/chat/completions`;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.options.config.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (this.options.config.httpReferer) {
      headers['HTTP-Referer'] = this.options.config.httpReferer;
    }

    if (this.options.config.appTitle) {
      headers['X-Title'] = this.options.config.appTitle;
    }

    return headers;
  }

  private buildBody(input: OpenRouterChatCompletionInput): OpenRouterChatCompletionBody {
    const body: OpenRouterChatCompletionBody = {
      model: input.model ?? this.options.config.defaultModel,
      messages: input.messages,
      max_tokens: input.maxTokens ?? this.options.config.maxTokens,
    };

    if (typeof input.temperature === 'number') {
      body.temperature = input.temperature;
    }

    return body;
  }

  private async mapResponse(response: OpenRouterHttpResponse): Promise<OpenRouterClientResult> {
    const rawBody = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        error: this.errorMapper.mapHttpError(response.status, rawBody),
      };
    }

    const parsed = safeJsonParse(rawBody);

    if (!parsed.ok) {
      return {
        ok: false,
        error: this.errorMapper.mapJsonParseFailure(),
      };
    }

    return {
      ok: true,
      value: {
        statusCode: response.status,
        rawBody,
        json: parsed.value,
        requestId: response.headers.get('x-request-id') ?? undefined,
      },
    };
  }

  private createDefaultFetcher(): OpenRouterFetcher {
    return async (url, init) => {
      if (typeof globalThis.fetch !== 'function') {
        throw new Error('Global fetch is not available in this runtime.');
      }

      const requestInit: RequestInit = {
        method: init.method,
        headers: init.headers,
        body: init.body,
      };

      if (init.signal !== undefined) {
        requestInit.signal = init.signal;
      }

      return globalThis.fetch(url, requestInit);
    };
  }
}
