import { ProviderStatusService } from '../providers/ProviderStatusService.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const missing = new ProviderStatusService({
  env: {},
}).getStatus();

const missingOpenRouter = missing.providers.find((provider) => provider.provider === 'openrouter');

if (!missingOpenRouter) {
  throw new Error('openrouter provider should exist');
}

assert(!missingOpenRouter.configured, 'openrouter should be missing without env key');
assert(
  missingOpenRouter.apiKeySource === 'missing',
  'missing provider should report missing source',
);
assert(missingOpenRouter.models.length >= 1, 'openrouter should expose model options');

const configured = new ProviderStatusService({
  env: {
    OPENROUTER_API_KEY: 'test-key',
  },
}).getStatus();

const configuredOpenRouter = configured.providers.find(
  (provider) => provider.provider === 'openrouter',
);

if (!configuredOpenRouter) {
  throw new Error('configured openrouter provider should exist');
}

assert(configuredOpenRouter.configured, 'openrouter should be configured with env key');
assert(configuredOpenRouter.apiKeyPresent, 'openrouter should detect api key');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'provider-status-test',
      missing: {
        configured: missingOpenRouter.configured,
        apiKeySource: missingOpenRouter.apiKeySource,
      },
      configured: {
        configured: configuredOpenRouter.configured,
        apiKeySource: configuredOpenRouter.apiKeySource,
      },
      models: configuredOpenRouter.models.map((model) => ({
        id: model.id,
        free: model.free,
        recommended: model.recommended,
      })),
    },
    null,
    2,
  ),
);
