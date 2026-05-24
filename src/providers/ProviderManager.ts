import { z } from 'zod';
import type {
  Provider,
  ProviderJsonResponse,
  ProviderName,
  ProviderRequest,
  ProviderResponse,
} from '../types/ProviderTypes.js';
import { ZeroRuntimeError } from '../utils/errors.js';
import { ProviderFallback } from './ProviderFallback.js';
import { StructuredOutputParser } from './StructuredOutputParser.js';

export class ProviderManager {
  private readonly providers = new Map<ProviderName, Provider>();
  private readonly fallback = new ProviderFallback();
  private readonly structuredOutputParser = new StructuredOutputParser();

  public register(provider: Provider): void {
    this.providers.set(provider.name, provider);
  }

  public get(providerName: ProviderName): Provider {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new ZeroRuntimeError(`Provider "${providerName}" is not registered.`, {
        code: 'PROVIDER_NOT_REGISTERED',
      });
    }

    return provider;
  }

  public async complete(
    providerName: ProviderName,
    request: ProviderRequest,
  ): Promise<ProviderResponse> {
    const provider = this.get(providerName);

    return provider.complete(request);
  }

  public async completeJson<TOutput>(
    providerName: ProviderName,
    request: ProviderRequest,
    schema: z.ZodType<TOutput>,
  ): Promise<ProviderJsonResponse<TOutput>> {
    const response = await this.complete(providerName, {
      ...request,
      responseFormat: 'json',
    });

    const parsed = this.structuredOutputParser.parseWithSchema(response.content, schema);

    if (!parsed.ok) {
      throw new ZeroRuntimeError('Provider returned invalid structured output.', {
        code: 'PROVIDER_INVALID_STRUCTURED_OUTPUT',
        cause: {
          error: this.serializeParserError(parsed.error),
          rawContentPreview: this.previewProviderContent(response.content),
          rawContentLength: response.content.length,
          model: response.model,
          providerResponseId: response.id,
        },
      });
    }

    return {
      ...response,
      parsed: parsed.value,
    };
  }

  public async completeWithFallback(request: ProviderRequest): Promise<ProviderResponse> {
    return this.fallback.completeWithFallback([...this.providers.values()], request);
  }
  private previewProviderContent(content: string): string {
    return content
      .replace(/sk-or-v1-[A-Za-z0-9._~:/+=-]+/g, 'sk-or-v1-[redacted]')
      .replace(/Bearer\s+[A-Za-z0-9._~:/+=-]+/gi, 'Bearer [redacted]')
      .slice(0, 1200);
  }
  private serializeParserError(error: unknown): Record<string, unknown> {
    if (error instanceof z.ZodError) {
      return {
        name: error.name,
        issues: error.issues.map((issue) => ({
          code: issue.code,
          path: issue.path,
          message: issue.message,
        })),
      };
    }

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
}
