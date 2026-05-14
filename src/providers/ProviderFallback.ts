import type {
  Provider,
  ProviderRequest,
  ProviderResponse,
} from "../types/ProviderTypes.js";
import { ZeroRuntimeError } from "../utils/errors.js";

export class ProviderFallback {
  public async completeWithFallback(
    providers: Provider[],
    request: ProviderRequest,
  ): Promise<ProviderResponse> {
    const errors: Error[] = [];

    for (const provider of providers) {
      try {
        return await provider.complete(request);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    throw new ZeroRuntimeError("All providers failed.", {
      code: "ALL_PROVIDERS_FAILED",
      cause: errors,
    });
  }
}
