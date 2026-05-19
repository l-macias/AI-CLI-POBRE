import type { OpenRouterClientResult } from './OpenRouterTypes.js';
import type {
  ProviderNormalizedTextResponse,
  ProviderNormalizedTextResult,
  ProviderRawResponseInput,
  ProviderResponseIssue,
  ProviderResponseUsage,
} from './ProviderResponseTypes.js';

interface UnknownRecord {
  [key: string]: unknown;
}

export interface NormalizeOpenRouterClientResultInput {
  result: OpenRouterClientResult;
  model: string;
  provider?: string | undefined;
}

export class ProviderResponseNormalizer {
  public normalizeOpenRouterClientResult(
    input: NormalizeOpenRouterClientResultInput,
  ): ProviderNormalizedTextResult {
    const provider = input.provider ?? 'openrouter';

    if (!input.result.ok) {
      return {
        ok: false,
        error: {
          code: 'PROVIDER_CLIENT_ERROR',
          message: input.result.error.message,
          provider,
          model: input.model,
          retryable: input.result.error.retryable,
          statusCode: input.result.error.statusCode,
        },
      };
    }

    return this.normalizeOpenRouterChatCompletion({
      provider,
      model: input.model,
      statusCode: input.result.value.statusCode,
      json: input.result.value.json,
      rawBody: input.result.value.rawBody,
      requestId: input.result.value.requestId,
    });
  }

  public normalizeOpenRouterChatCompletion(
    input: ProviderRawResponseInput,
  ): ProviderNormalizedTextResult {
    const root = this.asRecord(input.json);

    if (!root) {
      return {
        ok: false,
        error: this.issue({
          input,
          code: 'PROVIDER_RESPONSE_INVALID_SHAPE',
          message: 'Provider response root must be an object.',
          retryable: false,
        }),
      };
    }

    const providerError = this.readProviderError(root);

    if (providerError) {
      return {
        ok: false,
        error: this.issue({
          input,
          code: 'PROVIDER_ERROR_PAYLOAD',
          message: providerError,
          retryable: this.isRetryableStatus(input.statusCode),
        }),
      };
    }

    const choices = root['choices'];

    if (!Array.isArray(choices)) {
      return {
        ok: false,
        error: this.issue({
          input,
          code: 'PROVIDER_RESPONSE_INVALID_SHAPE',
          message: 'Provider response choices must be an array.',
          retryable: false,
        }),
      };
    }

    if (choices.length === 0) {
      return {
        ok: false,
        error: this.issue({
          input,
          code: 'PROVIDER_RESPONSE_EMPTY_CHOICES',
          message: 'Provider response choices array is empty.',
          retryable: true,
        }),
      };
    }

    const firstChoice = this.asRecord(choices[0]);

    if (!firstChoice) {
      return {
        ok: false,
        error: this.issue({
          input,
          code: 'PROVIDER_RESPONSE_INVALID_SHAPE',
          message: 'Provider response first choice must be an object.',
          retryable: false,
        }),
      };
    }

    const message = this.asRecord(firstChoice['message']);

    if (!message) {
      return {
        ok: false,
        error: this.issue({
          input,
          code: 'PROVIDER_RESPONSE_MESSAGE_MISSING',
          message: 'Provider response first choice is missing message object.',
          retryable: true,
        }),
      };
    }

    if (!Object.prototype.hasOwnProperty.call(message, 'content')) {
      return {
        ok: false,
        error: this.issue({
          input,
          code: 'PROVIDER_RESPONSE_CONTENT_MISSING',
          message: 'Provider response message is missing content.',
          retryable: true,
        }),
      };
    }

    const content = message['content'];

    if (typeof content !== 'string') {
      return {
        ok: false,
        error: this.issue({
          input,
          code: 'PROVIDER_RESPONSE_CONTENT_NOT_STRING',
          message: 'Provider response message content must be a string.',
          retryable: false,
        }),
      };
    }

    const normalized: ProviderNormalizedTextResponse = {
      provider: input.provider,
      model: input.model,
      text: content,
      statusCode: input.statusCode,
      normalizedAt: new Date().toISOString(),
    };

    const usage = this.readUsage(root);

    if (usage) {
      normalized.usage = usage;
    }

    const finishReason = this.readOptionalString(firstChoice['finish_reason']);

    if (finishReason) {
      normalized.finishReason = finishReason;
    }

    if (input.requestId) {
      normalized.requestId = input.requestId;
    }

    return {
      ok: true,
      value: normalized,
    };
  }

  private issue(input: {
    input: ProviderRawResponseInput;
    code: ProviderResponseIssue['code'];
    message: string;
    retryable: boolean;
  }): ProviderResponseIssue {
    const issue: ProviderResponseIssue = {
      code: input.code,
      message: input.message,
      provider: input.input.provider,
      model: input.input.model,
      retryable: input.retryable,
      statusCode: input.input.statusCode,
    };

    if (input.input.requestId) {
      issue.requestId = input.input.requestId;
    }

    return issue;
  }

  private asRecord(value: unknown): UnknownRecord | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null;
    }

    return value as UnknownRecord;
  }

  private readProviderError(root: UnknownRecord): string | null {
    const error = this.asRecord(root['error']);

    if (!error) {
      return null;
    }

    const message = this.readOptionalString(error['message']);
    const code = this.readOptionalString(error['code']);

    if (message && code) {
      return `${code}: ${this.sanitizeProviderMessage(message)}`;
    }

    if (message) {
      return this.sanitizeProviderMessage(message);
    }

    if (code) {
      return code;
    }

    return 'Provider returned an error payload.';
  }

  private readUsage(root: UnknownRecord): ProviderResponseUsage | null {
    const usage = this.asRecord(root['usage']);

    if (!usage) {
      return null;
    }

    const promptTokens = this.readOptionalNumber(usage['prompt_tokens']);
    const completionTokens = this.readOptionalNumber(usage['completion_tokens']);
    const totalTokens = this.readOptionalNumber(usage['total_tokens']);

    if (promptTokens === undefined && completionTokens === undefined && totalTokens === undefined) {
      return null;
    }

    const normalized: ProviderResponseUsage = {};

    if (promptTokens !== undefined) {
      normalized.promptTokens = promptTokens;
    }

    if (completionTokens !== undefined) {
      normalized.completionTokens = completionTokens;
    }

    if (totalTokens !== undefined) {
      normalized.totalTokens = totalTokens;
    }

    return normalized;
  }

  private readOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();

    if (!normalized) {
      return undefined;
    }

    return normalized;
  }

  private readOptionalNumber(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return undefined;
    }

    return Math.max(0, Math.floor(value));
  }

  private sanitizeProviderMessage(value: string): string {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~:/+=-]+/gi, 'Bearer [redacted]')
      .replace(/sk-or-v1-[A-Za-z0-9._~:/+=-]+/gi, 'sk-or-v1-[redacted]')
      .slice(0, 300);
  }

  private isRetryableStatus(statusCode: number): boolean {
    return statusCode === 408 || statusCode === 429 || statusCode >= 500;
  }
}
