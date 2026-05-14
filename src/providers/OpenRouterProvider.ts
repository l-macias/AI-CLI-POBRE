import type {
  Provider,
  ProviderReasoningOptions,
  ProviderRequest,
  ProviderResponse,
  ProviderUsage,
} from '../types/ProviderTypes.js';
import type { JsonObject } from '../types/SharedTypes.js';
import { ZeroRuntimeError } from '../utils/errors.js';
import { ResponseSanitizer } from './ResponseSanitizer.js';

interface OpenRouterProviderOptions {
  apiKey?: string | undefined;
  baseUrl: string;
}

interface OpenRouterMessage {
  role: string;
  content: string;
}

interface OpenRouterRequestBody {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: {
    type: 'json_object';
  };
  reasoning?: ProviderReasoningOptions;
}

interface OpenRouterChoice {
  message?: {
    content?: string;
  };
}

interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface OpenRouterErrorBody {
  error?: {
    message?: string;
    code?: string | number;
    metadata?: unknown;
  };
  user_id?: string;
}

interface OpenRouterResponseBody {
  id?: string;
  model?: string;
  choices?: OpenRouterChoice[];
  usage?: OpenRouterUsage;
}

interface OpenRouterRequestFailureCause {
  provider: 'openrouter';
  status: number;
  statusText: string;
  responseBody: string;
  parsedError?: OpenRouterErrorBody;
  request: {
    model: string;
    messageCount: number;
    responseFormat?: ProviderRequest['responseFormat'];
    maxTokens?: number;
    temperature?: number;
    reasoningEnabled: boolean;
  };
}

export class OpenRouterProvider implements Provider {
  public readonly name = 'openrouter' as const;

  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly sanitizer = new ResponseSanitizer();

  public constructor(options: OpenRouterProviderOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
  }

  public async complete(request: ProviderRequest): Promise<ProviderResponse> {
    if (!this.apiKey) {
      throw new ZeroRuntimeError('OpenRouter API key is not configured.', {
        code: 'OPENROUTER_API_KEY_MISSING',
      });
    }

    const body: OpenRouterRequestBody = {
      model: request.model,
      messages: request.messages,
    };

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      body.max_tokens = request.maxTokens;
    }

    if (request.responseFormat === 'json') {
      body.response_format = {
        type: 'json_object',
      };
    }

    if (request.reasoning !== undefined) {
      body.reasoning = request.reasoning;
    }

    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://zero-runtime.local',
          'X-Title': 'Zero Runtime',
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new ZeroRuntimeError('OpenRouter network request failed.', {
        code: 'OPENROUTER_NETWORK_ERROR',
        cause: this.serializeUnknownError(error),
      });
    }

    if (!response.ok) {
      const rawResponseBody = await this.safeReadResponseText(response);
      const responseBody = this.sanitizeProviderErrorBody(rawResponseBody);
      const parsedError = this.tryParseOpenRouterError(responseBody);

      const cause: OpenRouterRequestFailureCause = {
        provider: 'openrouter',
        status: response.status,
        statusText: response.statusText,
        responseBody,
        request: {
          model: request.model,
          messageCount: request.messages.length,
          reasoningEnabled: request.reasoning !== undefined,
        },
      };

      if (parsedError !== undefined) {
        cause.parsedError = parsedError;
      }

      if (request.responseFormat !== undefined) {
        cause.request.responseFormat = request.responseFormat;
      }

      if (request.maxTokens !== undefined) {
        cause.request.maxTokens = request.maxTokens;
      }

      if (request.temperature !== undefined) {
        cause.request.temperature = request.temperature;
      }

      throw new ZeroRuntimeError(
        `OpenRouter request failed: ${response.status} ${response.statusText}`,
        {
          code: 'OPENROUTER_REQUEST_FAILED',
          cause,
        },
      );
    }

    let data: OpenRouterResponseBody;

    try {
      data = (await response.json()) as OpenRouterResponseBody;
    } catch (error) {
      throw new ZeroRuntimeError('OpenRouter response was not valid JSON.', {
        code: 'OPENROUTER_INVALID_RESPONSE_JSON',
        cause: this.serializeUnknownError(error),
      });
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new ZeroRuntimeError('OpenRouter response did not include message content.', {
        code: 'OPENROUTER_EMPTY_RESPONSE',
        cause: data,
      });
    }

    const usage = this.mapUsage(data.usage);

    const providerResponse: ProviderResponse = {
      id: data.id ?? crypto.randomUUID(),
      model: data.model ?? request.model,
      content: this.sanitizer.sanitizeContent(content),
      raw: data as JsonObject,
    };

    if (usage !== undefined) {
      providerResponse.usage = usage;
    }

    return providerResponse;
  }

  private async safeReadResponseText(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch (error) {
      return `Unable to read OpenRouter error response body: ${String(error)}`;
    }
  }

  private sanitizeProviderErrorBody(responseBody: string): string {
    return responseBody.replace(/"user_id"\s*:\s*"[^"]+"/g, '"user_id":"[redacted]"');
  }

  private tryParseOpenRouterError(responseBody: string): OpenRouterErrorBody | undefined {
    try {
      const parsed = JSON.parse(responseBody) as unknown;

      if (this.isRecord(parsed)) {
        return parsed;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  private serializeUnknownError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      const serialized: Record<string, unknown> = {
        name: error.name,
        message: error.message,
      };

      if (error.stack !== undefined) {
        serialized['stack'] = error.stack;
      }

      return serialized;
    }

    return {
      message: String(error),
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private mapUsage(usage: OpenRouterUsage | undefined): ProviderUsage | undefined {
    if (!usage) {
      return undefined;
    }

    const mapped: ProviderUsage = {};

    if (usage.prompt_tokens !== undefined) {
      mapped.promptTokens = usage.prompt_tokens;
    }

    if (usage.completion_tokens !== undefined) {
      mapped.completionTokens = usage.completion_tokens;
    }

    if (usage.total_tokens !== undefined) {
      mapped.totalTokens = usage.total_tokens;
    }

    return mapped;
  }
}
