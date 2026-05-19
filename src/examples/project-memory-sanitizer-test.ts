import { ProjectMemorySanitizer } from '../memory/ProjectMemorySanitizer.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

const sanitizer = new ProjectMemorySanitizer();

const redactedText = sanitizer.sanitizeText(
  'Use OPENROUTER_API_KEY=sk-or-v1-secret-should-not-leak and Bearer abcdefghijklmnop',
);

assert(
  !redactedText.includes('secret-should-not-leak'),
  'Sanitized text must redact OpenRouter API key values.',
);
assert(
  !redactedText.includes('Bearer abcdefghijklmnop'),
  'Sanitized text must redact bearer tokens.',
);
assert(redactedText.includes('[REDACTED]'), 'Sanitized text should include redacted marker.');

const metadata = sanitizer.sanitizeMetadata({
  provider: 'openrouter',
  apiKey: 'sk-or-v1-secret-should-not-leak',
  nested: {
    authorization: 'Bearer abcdefghijklmnop',
    safeMetric: 123,
  },
});

const safeMetadata = requireValue(metadata, 'Sanitized metadata should be returned.');

assert(safeMetadata['apiKey'] === '[REDACTED]', 'Sanitized metadata must redact apiKey fields.');

const nested = safeMetadata['nested'];

assert(
  typeof nested === 'object' && nested !== null && !Array.isArray(nested),
  'Sanitized metadata should preserve nested object shape.',
);

if (typeof nested === 'object' && nested !== null && !Array.isArray(nested)) {
  assert(
    nested['authorization'] === '[REDACTED]',
    'Sanitized metadata must redact authorization fields.',
  );
  assert(nested['safeMetric'] === 123, 'Sanitized metadata should preserve safe metrics.');
}

assert(sanitizer.isBlockedPath('.env'), 'Sanitizer should block .env path.');
assert(sanitizer.isBlockedPath('config/secrets.json'), 'Sanitizer should block secrets path.');
assert(sanitizer.isBlockedPath('keys/id_rsa'), 'Sanitizer should block private SSH key path.');
assert(
  !sanitizer.isBlockedPath('src/repair/OpenRouterRepairProposalProvider.ts'),
  'Sanitizer should allow normal source paths.',
);

let blockedPath = false;

try {
  sanitizer.assertSafePath('.env.local');
} catch (error) {
  blockedPath = error instanceof Error && error.message.includes('sensitive path');
}

assert(blockedPath, 'Sanitizer should throw for sensitive paths.');

let blockedRawProviderResponse = false;

try {
  sanitizer.assertSafeMemoryInput({
    title: 'Provider raw response',
    content: 'raw provider response: should not be stored',
  });
} catch (error) {
  blockedRawProviderResponse =
    error instanceof Error && error.message.includes('raw provider responses');
}

assert(blockedRawProviderResponse, 'Sanitizer should throw for raw provider responses.');

const tags = sanitizer.normalizeTags([' Provider ', 'provider', ' Runtime ', '', 'runtime']);

assert(tags.length === 2, 'Sanitizer should deduplicate and normalize tags.');
assert(tags.includes('provider'), 'Sanitizer should include normalized provider tag.');
assert(tags.includes('runtime'), 'Sanitizer should include normalized runtime tag.');

const normalizedPath = sanitizer.normalizeRelativePath('src\\memory\\ProjectMemoryStore.ts');

assert(
  normalizedPath === 'src/memory/ProjectMemoryStore.ts',
  'Sanitizer should normalize Windows path separators.',
);

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'project-memory-sanitizer-test',
    },
    null,
    2,
  ),
);
