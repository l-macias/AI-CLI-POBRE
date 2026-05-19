import type { OpenRouterErrorCode, OpenRouterProviderError } from './OpenRouterTypes.js';

const maxSafeProviderMessageLength = 300;

export class ProviderErrorMapper {
  public mapHttpError(statusCode: number, rawBody: string): OpenRouterProviderError {
    const code = this.resolveHttpCode(statusCode);
    const safeBody = this.sanitize(rawBody);

    return {
      code,
      message: this.buildHttpMessage(statusCode, safeBody),
      retryable: this.isRetryableHttpStatus(statusCode),
      statusCode,
    };
  }

  public mapNetworkError(error: unknown): OpenRouterProviderError {
    const causeName = error instanceof Error ? error.name : undefined;

    return {
      code: 'OPENROUTER_NETWORK_ERROR',
      message: 'OpenRouter network request failed.',
      retryable: true,
      causeName,
    };
  }

  public mapInvalidResponse(message: string): OpenRouterProviderError {
    return {
      code: 'OPENROUTER_INVALID_RESPONSE',
      message,
      retryable: false,
    };
  }

  public mapJsonParseFailure(): OpenRouterProviderError {
    return {
      code: 'OPENROUTER_JSON_PARSE_FAILED',
      message: 'OpenRouter response body was not valid JSON.',
      retryable: false,
    };
  }

  public sanitize(value: string): string {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~:/+=-]+/gi, 'Bearer [redacted]')
      .replace(/sk-or-v1-[A-Za-z0-9._~:/+=-]+/gi, 'sk-or-v1-[redacted]')
      .slice(0, maxSafeProviderMessageLength);
  }

  private resolveHttpCode(statusCode: number): OpenRouterErrorCode {
    if (statusCode === 401) {
      return 'OPENROUTER_UNAUTHORIZED';
    }

    if (statusCode === 403) {
      return 'OPENROUTER_FORBIDDEN';
    }

    if (statusCode === 429) {
      return 'OPENROUTER_RATE_LIMITED';
    }

    if (statusCode >= 500) {
      return 'OPENROUTER_UNAVAILABLE';
    }

    return 'OPENROUTER_HTTP_ERROR';
  }

  private buildHttpMessage(statusCode: number, safeBody: string): string {
    if (!safeBody) {
      return `OpenRouter request failed with HTTP ${statusCode}.`;
    }

    return `OpenRouter request failed with HTTP ${statusCode}: ${safeBody}`;
  }

  private isRetryableHttpStatus(statusCode: number): boolean {
    return statusCode === 408 || statusCode === 429 || statusCode >= 500;
  }
}
