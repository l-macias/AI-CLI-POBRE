import type { Provider, ProviderRequest, ProviderResponse } from '../types/ProviderTypes.js';
import { ZeroRuntimeError } from '../utils/errors.js';

export interface ProviderFallbackAttempt {
  provider: string;
  selected: boolean;
  failed: boolean;
  reason: string;
}

export interface ProviderFallbackResult {
  response: ProviderResponse;
  attempts: ProviderFallbackAttempt[];
  providerFallbackUsed: boolean;
  providerFallbackReason: string;
}

export class ProviderFallback {
  public async completeWithFallback(
    providers: Provider[],
    request: ProviderRequest,
  ): Promise<ProviderResponse> {
    const result = await this.completeWithFallbackAudit(providers, request);

    return result.response;
  }

  public async completeWithFallbackAudit(
    providers: Provider[],
    request: ProviderRequest,
  ): Promise<ProviderFallbackResult> {
    const errors: Error[] = [];
    const attempts: ProviderFallbackAttempt[] = [];

    for (let index = 0; index < providers.length; index += 1) {
      const provider = providers[index];

      if (!provider) {
        continue;
      }

      try {
        const response = await provider.complete(request);

        attempts.push({
          provider: provider.name,
          selected: true,
          failed: false,
          reason:
            index === 0
              ? 'Primary provider completed successfully.'
              : 'Fallback provider completed successfully after previous provider failure.',
        });

        return {
          response,
          attempts,
          providerFallbackUsed: index > 0,
          providerFallbackReason:
            index === 0
              ? 'Primary provider completed successfully; fallback was not needed.'
              : `Fallback provider "${provider.name}" completed successfully.`,
        };
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        errors.push(normalizedError);

        attempts.push({
          provider: provider.name,
          selected: false,
          failed: true,
          reason: normalizedError.message,
        });
      }
    }

    throw new ZeroRuntimeError('All providers failed.', {
      code: 'ALL_PROVIDERS_FAILED',
      cause: {
        errors,
        attempts,
      },
    });
  }
}
