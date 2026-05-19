import type { OpenRouterProviderError } from './OpenRouterTypes.js';

export interface ProviderTimeoutHandle {
  signal: AbortSignal;
  clear(): void;
}

export class ProviderTimeoutPolicy {
  public create(timeoutMs: number): ProviderTimeoutHandle {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    return {
      signal: controller.signal,
      clear: () => {
        clearTimeout(timeout);
      },
    };
  }

  public isTimeoutError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return error.name === 'AbortError';
  }

  public toTimeoutError(): OpenRouterProviderError {
    return {
      code: 'OPENROUTER_TIMEOUT',
      message: 'OpenRouter request timed out.',
      retryable: true,
    };
  }
}
