import { z } from 'zod';
import { loadEnv } from '../config/env.js';
import { Logger } from '../observability/Logger.js';
import { ModelSelector } from '../providers/ModelSelector.js';
import { OpenRouterProvider } from '../providers/OpenRouterProvider.js';
import { ProviderManager } from '../providers/ProviderManager.js';
import { ZeroRuntimeError } from '../utils/errors.js';

const logger = new Logger({
  namespace: 'zero-runtime:provider-smoke-test',
  level: 'debug',
});

const smokeTestSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
});

async function main(): Promise<void> {
  const env = loadEnv();

  if (!env.OPENROUTER_API_KEY) {
    throw new ZeroRuntimeError('OPENROUTER_API_KEY is required for provider smoke test.', {
      code: 'OPENROUTER_API_KEY_MISSING',
    });
  }

  const modelSelector = new ModelSelector({
    defaultModel: env.OPENROUTER_DEFAULT_MODEL,
  });

  const providerManager = new ProviderManager();

  providerManager.register(
    new OpenRouterProvider({
      apiKey: env.OPENROUTER_API_KEY,
      baseUrl: env.OPENROUTER_BASE_URL,
    }),
  );

  const model = modelSelector.selectModel();

  logger.info('Sending provider smoke test request', {
    provider: 'openrouter',
    model,
  });
  const capabilities = modelSelector.getCapabilities(model);
  const response = await providerManager.completeJson(
    'openrouter',
    {
      model,
      temperature: 0,
      maxTokens: Math.min(capabilities.recommendedMaxTokens, 80),
      ...(capabilities.supportsReasoningControl
        ? {
            reasoning: {
              effort: 'none',
              exclude: true,
            },
          }
        : {}),
      messages: [
        {
          role: 'system',
          content: 'JSON only.',
        },
        {
          role: 'user',
          content: 'Return {"ok":true,"message":"ready"}',
        },
      ],
    },
    smokeTestSchema,
  );

  logger.info('Provider smoke test completed', {
    response: response.parsed,
    model: response.model,
    usage: response.usage ?? null,
  });
}

main().catch((error: unknown) => {
  logger.error('Provider smoke test failed', {
    error: error instanceof Error ? error.message : String(error),
    cause: error instanceof ZeroRuntimeError ? error.cause : null,
  });

  process.exitCode = 1;
});
