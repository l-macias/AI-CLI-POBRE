import { ProviderResponseNormalizer } from '../providers/ProviderResponseNormalizer.js';
import type { OpenRouterClientResult } from '../providers/OpenRouterTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const normalizer = new ProviderResponseNormalizer();

const valid = normalizer.normalizeOpenRouterChatCompletion({
  provider: 'openrouter',
  model: 'provider-strategy/model-from-policy',
  statusCode: 200,
  requestId: 'request-test-001',
  rawBody: '{}',
  json: {
    id: 'completion-test-001',
    choices: [
      {
        message: {
          role: 'assistant',
          content: '{"id":"patch-proposal"}',
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    },
  },
});

assert(valid.ok, 'Valid OpenRouter response should normalize.');

if (valid.ok) {
  assert(
    valid.value.text === '{"id":"patch-proposal"}',
    'Normalizer should extract assistant message content.',
  );
  assert(valid.value.provider === 'openrouter', 'Normalizer should preserve provider.');
  assert(
    valid.value.model === 'provider-strategy/model-from-policy',
    'Normalizer should preserve model.',
  );
  assert(valid.value.requestId === 'request-test-001', 'Normalizer should preserve request id.');
  assert(valid.value.finishReason === 'stop', 'Normalizer should preserve finish reason.');
  assert(valid.value.usage?.promptTokens === 10, 'Normalizer should preserve prompt tokens.');
  assert(
    valid.value.usage?.completionTokens === 5,
    'Normalizer should preserve completion tokens.',
  );
  assert(valid.value.usage?.totalTokens === 15, 'Normalizer should preserve total tokens.');
}

const emptyChoices = normalizer.normalizeOpenRouterChatCompletion({
  provider: 'openrouter',
  model: 'provider-strategy/model-from-policy',
  statusCode: 200,
  rawBody: '{}',
  json: {
    choices: [],
  },
});

assert(!emptyChoices.ok, 'Empty choices should fail normalization.');

if (!emptyChoices.ok) {
  assert(
    emptyChoices.error.code === 'PROVIDER_RESPONSE_EMPTY_CHOICES',
    'Empty choices should produce specific issue code.',
  );
  assert(emptyChoices.error.retryable, 'Empty choices should be retryable.');
}

const missingMessage = normalizer.normalizeOpenRouterChatCompletion({
  provider: 'openrouter',
  model: 'provider-strategy/model-from-policy',
  statusCode: 200,
  rawBody: '{}',
  json: {
    choices: [
      {
        finish_reason: 'stop',
      },
    ],
  },
});

assert(!missingMessage.ok, 'Missing message should fail normalization.');

if (!missingMessage.ok) {
  assert(
    missingMessage.error.code === 'PROVIDER_RESPONSE_MESSAGE_MISSING',
    'Missing message should produce specific issue code.',
  );
}

const missingContent = normalizer.normalizeOpenRouterChatCompletion({
  provider: 'openrouter',
  model: 'provider-strategy/model-from-policy',
  statusCode: 200,
  rawBody: '{}',
  json: {
    choices: [
      {
        message: {
          role: 'assistant',
        },
      },
    ],
  },
});

assert(!missingContent.ok, 'Missing content should fail normalization.');

if (!missingContent.ok) {
  assert(
    missingContent.error.code === 'PROVIDER_RESPONSE_CONTENT_MISSING',
    'Missing content should produce specific issue code.',
  );
}

const nonStringContent = normalizer.normalizeOpenRouterChatCompletion({
  provider: 'openrouter',
  model: 'provider-strategy/model-from-policy',
  statusCode: 200,
  rawBody: '{}',
  json: {
    choices: [
      {
        message: {
          role: 'assistant',
          content: [
            {
              type: 'text',
              text: 'not supported yet',
            },
          ],
        },
      },
    ],
  },
});

assert(!nonStringContent.ok, 'Non-string content should fail normalization.');

if (!nonStringContent.ok) {
  assert(
    nonStringContent.error.code === 'PROVIDER_RESPONSE_CONTENT_NOT_STRING',
    'Non-string content should produce specific issue code.',
  );
  assert(!nonStringContent.error.retryable, 'Non-string content should not be retryable.');
}

const providerErrorPayload = normalizer.normalizeOpenRouterChatCompletion({
  provider: 'openrouter',
  model: 'provider-strategy/model-from-policy',
  statusCode: 429,
  rawBody: '{}',
  json: {
    error: {
      code: 'rate_limit_exceeded',
      message: 'Rate limited sk-or-v1-secret-should-not-leak',
    },
  },
});

assert(!providerErrorPayload.ok, 'Provider error payload should fail normalization.');

if (!providerErrorPayload.ok) {
  assert(
    providerErrorPayload.error.code === 'PROVIDER_ERROR_PAYLOAD',
    'Provider error payload should produce specific issue code.',
  );
  assert(providerErrorPayload.error.retryable, 'HTTP 429 provider error should be retryable.');
  assert(
    !providerErrorPayload.error.message.includes('secret-should-not-leak'),
    'Provider error payload must redact API-key-like secrets.',
  );
}

const clientRateLimit: OpenRouterClientResult = {
  ok: false,
  error: {
    code: 'OPENROUTER_RATE_LIMITED',
    message: 'OpenRouter request failed with HTTP 429.',
    retryable: true,
    statusCode: 429,
  },
};

const normalizedClientRateLimit = normalizer.normalizeOpenRouterClientResult({
  result: clientRateLimit,
  model: 'provider-strategy/model-from-policy',
});

assert(!normalizedClientRateLimit.ok, 'Client rate limit should fail normalization.');

if (!normalizedClientRateLimit.ok) {
  assert(
    normalizedClientRateLimit.error.code === 'PROVIDER_CLIENT_ERROR',
    'Client error should map to provider client error.',
  );
  assert(normalizedClientRateLimit.error.retryable, 'Client rate limit should remain retryable.');
  assert(
    normalizedClientRateLimit.error.statusCode === 429,
    'Client rate limit should preserve status code.',
  );
}

const clientTimeout: OpenRouterClientResult = {
  ok: false,
  error: {
    code: 'OPENROUTER_TIMEOUT',
    message: 'OpenRouter request timed out.',
    retryable: true,
  },
};

const normalizedTimeout = normalizer.normalizeOpenRouterClientResult({
  result: clientTimeout,
  model: 'provider-strategy/model-from-policy',
});

assert(!normalizedTimeout.ok, 'Client timeout should fail normalization.');

if (!normalizedTimeout.ok) {
  assert(
    normalizedTimeout.error.code === 'PROVIDER_CLIENT_ERROR',
    'Timeout should map to provider client error.',
  );
  assert(normalizedTimeout.error.retryable, 'Timeout should remain retryable.');
}

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'provider-response-normalizer-test',
    },
    null,
    2,
  ),
);
