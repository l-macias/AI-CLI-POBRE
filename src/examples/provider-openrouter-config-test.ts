import { OpenRouterConfigLoader } from '../providers/OpenRouterConfigLoader.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(value: string, expected: string, message: string): void {
  if (!value.includes(expected)) {
    throw new Error(message);
  }
}

const loader = new OpenRouterConfigLoader();

const disabled = loader.load({
  env: {},
  defaultModel: 'poolside/laguna-xs.2:free',
});

assert(!disabled.ok, 'OpenRouter config should require explicit opt-in by default.');

if (!disabled.ok) {
  assertIncludes(
    disabled.error.message,
    'not enabled',
    'Disabled OpenRouter config should explain missing opt-in.',
  );
}

const missingKey = loader.load({
  env: {
    ZERO_OPENROUTER_ENABLED: '1',
  },
  defaultModel: 'poolside/laguna-xs.2:free',
});

assert(!missingKey.ok, 'OpenRouter config should require API key by default.');

if (!missingKey.ok) {
  assertIncludes(
    missingKey.error.message,
    'API key',
    'Missing OpenRouter API key should produce a clear safe error.',
  );
}

const missingModel = loader.load({
  env: {
    ZERO_OPENROUTER_ENABLED: '1',
    OPENROUTER_API_KEY: 'sk-or-v1-test-key-123456789',
  },
});

assert(!missingModel.ok, 'OpenRouter config should require model from env or injected strategy.');

if (!missingModel.ok) {
  assertIncludes(
    missingModel.error.message,
    'model',
    'Missing OpenRouter model should produce a clear safe error.',
  );
}

const loadedFromEnvModel = loader.load({
  env: {
    ZERO_OPENROUTER_ENABLED: '1',
    OPENROUTER_API_KEY: 'sk-or-v1-test-key-123456789',
    ZERO_OPENROUTER_MODEL: 'poolside/laguna-xs.2:free',
    ZERO_OPENROUTER_TIMEOUT_MS: '5000',
    ZERO_OPENROUTER_MAX_TOKENS: '900',
    OPENROUTER_HTTP_REFERER: 'https://example.test',
    OPENROUTER_APP_TITLE: 'Zero Runtime Test',
  },
});

assert(
  loadedFromEnvModel.ok,
  'OpenRouter config should load with explicit opt-in, API key, and env model.',
);

if (loadedFromEnvModel.ok) {
  assert(loadedFromEnvModel.value.enabled, 'OpenRouter config should be enabled.');
  assert(
    loadedFromEnvModel.value.defaultModel === 'poolside/laguna-xs.2:free',
    'OpenRouter model should come from env.',
  );
  assert(loadedFromEnvModel.value.timeoutMs === 5000, 'OpenRouter timeout should be parsed.');
  assert(loadedFromEnvModel.value.maxTokens === 900, 'OpenRouter max tokens should be parsed.');
  assert(
    loadedFromEnvModel.value.baseUrl === 'https://openrouter.ai/api/v1',
    'OpenRouter base URL should use safe default.',
  );

  const redacted = loader.redacted(loadedFromEnvModel.value);

  assert(redacted.apiKey === '[redacted]', 'Redacted config must not expose API key.');
}

const loadedFromInjectedModel = loader.load({
  env: {
    ZERO_OPENROUTER_ENABLED: '1',
    OPENROUTER_API_KEY: 'sk-or-v1-test-key-123456789',
  },
  defaultModel: 'provider-strategy/model-from-policy',
});

assert(
  loadedFromInjectedModel.ok,
  'OpenRouter config should allow model injected from provider strategy.',
);

if (loadedFromInjectedModel.ok) {
  assert(
    loadedFromInjectedModel.value.defaultModel === 'provider-strategy/model-from-policy',
    'OpenRouter model should support injected provider strategy default.',
  );
}

const invalidTimeout = loader.load({
  env: {
    ZERO_OPENROUTER_ENABLED: '1',
    OPENROUTER_API_KEY: 'sk-or-v1-test-key-123456789',
    ZERO_OPENROUTER_TIMEOUT_MS: 'not-a-number',
  },
  defaultModel: 'poolside/laguna-xs.2:free',
});

assert(!invalidTimeout.ok, 'Invalid timeout should fail safely.');

const invalidBaseUrl = loader.load({
  env: {
    ZERO_OPENROUTER_ENABLED: '1',
    OPENROUTER_API_KEY: 'sk-or-v1-test-key-123456789',
    OPENROUTER_BASE_URL: 'http://openrouter.ai/api/v1',
  },
  defaultModel: 'poolside/laguna-xs.2:free',
});

assert(!invalidBaseUrl.ok, 'Non-HTTPS OpenRouter base URL should fail safely.');

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'provider-openrouter-config-test',
    },
    null,
    2,
  ),
);
