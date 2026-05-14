import { ZeroRuntimeError } from '../utils/errors.js';
import type {
  PlanGenerationFailureKind,
  PlanGenerationRetryDecision,
} from './PlanGenerationAttempt.js';

export class PlanGenerationRetryPolicy {
  public classify(error: unknown): PlanGenerationFailureKind {
    if (!(error instanceof ZeroRuntimeError)) {
      return 'unknown';
    }

    if (error.code === 'PROVIDER_INVALID_STRUCTURED_OUTPUT') {
      return this.classifyStructuredOutputError(error.cause);
    }

    if (error.code === 'OPENROUTER_REQUEST_FAILED') {
      return this.classifyOpenRouterRequestFailure(error.cause);
    }

    if (error.code === 'OPENROUTER_NETWORK_ERROR') {
      return 'provider_network_error';
    }

    if (error.code === 'OPENROUTER_EMPTY_RESPONSE') {
      return 'provider_empty_response';
    }

    return 'provider_unknown';
  }

  public shouldRetry(input: {
    failureKind: PlanGenerationFailureKind;
    attemptIndex: number;
    maxAttempts: number;
  }): PlanGenerationRetryDecision {
    if (input.attemptIndex >= input.maxAttempts - 1) {
      return {
        retry: false,
        reason: 'Maximum plan generation attempts reached.',
      };
    }

    if (
      input.failureKind === 'invalid_json' ||
      input.failureKind === 'invalid_schema' ||
      input.failureKind === 'provider_empty_response'
    ) {
      return {
        retry: true,
        reason: `Retry allowed for recoverable failure: ${input.failureKind}.`,
      };
    }

    return {
      retry: false,
      reason: `Retry blocked for non-retryable failure: ${input.failureKind}.`,
    };
  }

  private classifyStructuredOutputError(cause: unknown): PlanGenerationFailureKind {
    if (!this.isRecord(cause)) {
      return 'invalid_schema';
    }

    const error = cause['error'];

    if (!this.isRecord(error)) {
      return 'invalid_schema';
    }

    const name = error['name'];

    if (name === 'SyntaxError') {
      return 'invalid_json';
    }

    if (name === 'ZodError') {
      return 'invalid_schema';
    }

    return 'invalid_schema';
  }

  private classifyOpenRouterRequestFailure(cause: unknown): PlanGenerationFailureKind {
    const status = this.extractStatus(cause);

    if (status === 429) {
      return 'provider_rate_limited';
    }

    if (status === 401) {
      return 'provider_auth_failed';
    }

    if (status === 402) {
      return 'provider_payment_required';
    }

    if (status === 403) {
      return 'provider_forbidden';
    }

    if (status === 404) {
      return 'provider_model_not_found';
    }

    return 'provider_unknown';
  }

  private extractStatus(cause: unknown): number | null {
    if (!this.isRecord(cause)) {
      return null;
    }

    const status = cause['status'];

    if (typeof status === 'number') {
      return status;
    }

    return null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
