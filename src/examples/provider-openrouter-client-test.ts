import { OpenRouterClient } from '../providers/OpenRouterClient.js';
import type {
  OpenRouterConfig,
  OpenRouterFetcher,
  OpenRouterFetchInit,
  OpenRouterHttpHeaders,
  OpenRouterHttpResponse,
} from '../providers/OpenRouterTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

class FakeHeaders implements OpenRouterHttpHeaders {
  private readonly values: Map<string, string>;

  public constructor(values: Record<string, string> = {}) {
    this.values = new Map(
      Object.entries(values).map(([key, value]) => {
        return [key.toLowerCase(), value];
      }),
    );
  }

  public get(name: string): string | null {
    return this.values.get(name.toLowerCase()) ?? null;
  }
}

function createResponse(input: {
  ok: boolean;
  status: number;
  body: string;
  headers?: Record<string, string> | undefined;
}): OpenRouterHttpResponse {
  return {
    ok: input.ok,
    status: input.status,
    headers: new FakeHeaders(input.headers),
    text: () => Promise.resolve(input.body),
  };
}

function createConfig(overrides: Partial<OpenRouterConfig> = {}): OpenRouterConfig {
  return {
    provider: 'openrouter',
    enabled: true,
    apiKey: 'sk-or-v1-test-key-123456789',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'poolside/laguna-xs.2:free',
    timeoutMs: 5_000,
    maxTokens: 1_200,
    ...overrides,
  };
}

interface CapturedRequest {
  url: string;
  init: OpenRouterFetchInit;
}

interface OpenRouterRequestBodyForTest {
  model: string;
  max_tokens: number;
  messages: Array<{
    role: string;
    content: string;
  }>;
}

function requireCapturedRequest(value: CapturedRequest | undefined): CapturedRequest {
  if (!value) {
    throw new Error('Expected OpenRouter request to be captured.');
  }

  return value;
}

function parseRequestBodyForTest(value: string): OpenRouterRequestBodyForTest {
  const parsed = JSON.parse(value) as OpenRouterRequestBodyForTest;

  assert(typeof parsed.model === 'string', 'Request body model should be a string.');
  assert(typeof parsed.max_tokens === 'number', 'Request body max_tokens should be a number.');
  assert(Array.isArray(parsed.messages), 'Request body messages should be an array.');

  return parsed;
}

let capturedRequest: CapturedRequest | undefined;

const successfulFetcher: OpenRouterFetcher = (url, init) => {
  capturedRequest = {
    url,
    init,
  };

  return Promise.resolve(
    createResponse({
      ok: true,
      status: 200,
      headers: {
        'x-request-id': 'request-test-001',
      },
      body: JSON.stringify({
        id: 'completion-test-001',
        choices: [
          {
            message: {
              role: 'assistant',
              content: '{"id":"proposal"}',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      }),
    }),
  );
};

const client = new OpenRouterClient({
  config: createConfig(),
  fetcher: successfulFetcher,
});

const success = await client.createChatCompletion({
  messages: [
    {
      role: 'user',
      content: 'Return a safe JSON patch proposal.',
    },
  ],
  temperature: 0,
});

assert(success.ok, 'OpenRouter client should return successful result for valid fake response.');

const successfulRequest = requireCapturedRequest(capturedRequest);

assert(
  successfulRequest.url === 'https://openrouter.ai/api/v1/chat/completions',
  'OpenRouter client should call chat completions endpoint.',
);
assert(
  successfulRequest.init.headers['Authorization'] === 'Bearer sk-or-v1-test-key-123456789',
  'OpenRouter client should set authorization header.',
);
assert(
  successfulRequest.init.headers['Content-Type'] === 'application/json',
  'OpenRouter client should set JSON content type.',
);

const body = parseRequestBodyForTest(successfulRequest.init.body);

assert(body.model === 'poolside/laguna-xs.2:free', 'OpenRouter client should use default model.');
assert(body.max_tokens === 1_200, 'OpenRouter client should use configured max tokens.');
assert(body.messages.length === 1, 'OpenRouter client should send messages.');

if (success.ok) {
  assert(success.value.statusCode === 200, 'OpenRouter client should preserve status code.');
  assert(
    success.value.requestId === 'request-test-001',
    'OpenRouter client should preserve request id when present.',
  );
}

const disabledClient = new OpenRouterClient({
  config: createConfig({
    enabled: false,
  }),
  fetcher: successfulFetcher,
});

const disabledResult = await disabledClient.createChatCompletion({
  messages: [
    {
      role: 'user',
      content: 'This should not call provider.',
    },
  ],
});

assert(!disabledResult.ok, 'Disabled OpenRouter client should not call provider.');

if (!disabledResult.ok) {
  assert(
    disabledResult.error.code === 'OPENROUTER_NOT_ENABLED',
    'Disabled OpenRouter client should return not-enabled error.',
  );
}

const httpErrorClient = new OpenRouterClient({
  config: createConfig(),
  fetcher: () =>
    Promise.resolve(
      createResponse({
        ok: false,
        status: 429,
        body: 'rate limited sk-or-v1-secret-should-not-leak',
      }),
    ),
});

const httpError = await httpErrorClient.createChatCompletion({
  messages: [
    {
      role: 'user',
      content: 'Trigger fake rate limit.',
    },
  ],
});

assert(!httpError.ok, 'HTTP error should return failed result.');

if (!httpError.ok) {
  assert(
    httpError.error.code === 'OPENROUTER_RATE_LIMITED',
    'HTTP 429 should map to rate limit error.',
  );
  assert(httpError.error.retryable, 'HTTP 429 should be retryable.');
  assert(
    !httpError.error.message.includes('secret-should-not-leak'),
    'Mapped provider error must redact API-key-like secrets.',
  );
}

const invalidJsonClient = new OpenRouterClient({
  config: createConfig(),
  fetcher: () =>
    Promise.resolve(
      createResponse({
        ok: true,
        status: 200,
        body: '{ invalid json',
      }),
    ),
});

const invalidJson = await invalidJsonClient.createChatCompletion({
  messages: [
    {
      role: 'user',
      content: 'Return invalid JSON.',
    },
  ],
});

assert(!invalidJson.ok, 'Invalid provider JSON should fail safely.');

if (!invalidJson.ok) {
  assert(
    invalidJson.error.code === 'OPENROUTER_JSON_PARSE_FAILED',
    'Invalid JSON should map to JSON parse failure.',
  );
}

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'provider-openrouter-client-test',
    },
    null,
    2,
  ),
);
