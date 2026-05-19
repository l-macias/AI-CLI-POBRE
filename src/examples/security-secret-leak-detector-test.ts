import { SecretLeakDetector } from '../security/SecretLeakDetector.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const detector = new SecretLeakDetector();

const safeScan = detector.scanText({
  source: 'safe-runtime-report',
  content: [
    '# Runtime report',
    'Provider: openrouter',
    'Model: poolside/laguna-xs.2:free',
    'Prompt tokens: 123',
    'Completion tokens: 45',
  ].join('\n'),
});

assert(safeScan.safe, 'Safe runtime report should pass secret leak scan.');
assert(safeScan.findings.length === 0, 'Safe runtime report should not produce findings.');

const openRouterKeyScan = detector.scanText({
  source: 'provider-error',
  content: 'Provider failed with OPENROUTER_API_KEY=sk-or-v1-secret-should-not-leak',
});

assert(!openRouterKeyScan.safe, 'OpenRouter API key leak should fail scan.');
assert(
  openRouterKeyScan.findings.some((finding) => finding.code === 'SECRET_OPENROUTER_API_KEY'),
  'OpenRouter API key leak should produce OpenRouter-specific finding.',
);
assert(
  openRouterKeyScan.findings.some((finding) => finding.code === 'SECRET_ENV_ASSIGNMENT'),
  'OpenRouter API key assignment should produce env-assignment finding.',
);
assert(
  !openRouterKeyScan.redactedContent.includes('secret-should-not-leak'),
  'Redacted content must not include leaked OpenRouter key material.',
);
assert(
  openRouterKeyScan.redactedContent.includes('[REDACTED]'),
  'Redacted content should include redaction marker.',
);

const bearerScan = detector.scanText({
  source: 'runtime-log',
  content: 'authorization: Bearer abcdefghijklmnopqrstuvwxyz123456',
});

assert(!bearerScan.safe, 'Bearer token leak should fail scan.');
assert(
  bearerScan.findings.some((finding) => finding.code === 'SECRET_BEARER_TOKEN'),
  'Bearer token leak should produce bearer-token finding.',
);
assert(
  !bearerScan.redactedContent.includes('abcdefghijklmnopqrstuvwxyz123456'),
  'Redacted content must remove bearer token value.',
);

const privateKeyScan = detector.scanText({
  source: 'memory-entry',
  content: [
    '-----BEGIN PRIVATE KEY-----',
    'super-secret-private-key-body',
    '-----END PRIVATE KEY-----',
  ].join('\n'),
});

assert(!privateKeyScan.safe, 'Private key block should fail scan.');
assert(
  privateKeyScan.findings.some((finding) => finding.code === 'SECRET_PRIVATE_KEY_BLOCK'),
  'Private key block should produce private-key finding.',
);
assert(
  !privateKeyScan.redactedContent.includes('super-secret-private-key-body'),
  'Redacted content must remove private key body.',
);

const jsonFieldScan = detector.scanText({
  source: 'runtime-report-json',
  content: JSON.stringify({
    provider: 'openrouter',
    apiKey: 'sk-or-v1-secret-should-not-leak',
    nested: {
      refreshToken: 'refresh-token-secret',
    },
  }),
});

assert(!jsonFieldScan.safe, 'Sensitive JSON-like fields should fail scan.');
assert(
  jsonFieldScan.findings.some((finding) => finding.code === 'SECRET_JSON_FIELD'),
  'Sensitive JSON-like fields should produce JSON field finding.',
);
assert(
  !jsonFieldScan.redactedContent.includes('refresh-token-secret'),
  'Redacted content must remove nested sensitive token values.',
);

const credentialUrlScan = detector.scanText({
  source: 'provider-output',
  content: 'postgres://runtime_user:runtime_password@localhost:5432/zero',
});

assert(!credentialUrlScan.safe, 'Credential-bearing URL should fail scan.');
assert(
  credentialUrlScan.findings.some((finding) => finding.code === 'SECRET_CREDENTIAL_URL'),
  'Credential-bearing URL should produce credential URL finding.',
);

const sensitivePathScan = detector.scanText({
  filePath: '.env.local',
  source: 'runtime-report',
  content: 'ZERO_OPENROUTER_ENABLED=1',
});

assert(!sensitivePathScan.safe, 'Sensitive file path should fail scan.');
assert(
  sensitivePathScan.findings.some((finding) => finding.code === 'SENSITIVE_PATH_SCANNED'),
  'Sensitive file path should produce sensitive path finding.',
);

assert(detector.isSensitivePath('.env'), 'Detector should mark .env as sensitive.');
assert(
  detector.isSensitivePath('config/secrets.json'),
  'Detector should mark secrets path sensitive.',
);
assert(
  detector.isSensitivePath('keys/id_rsa'),
  'Detector should mark SSH private key path sensitive.',
);
assert(
  !detector.isSensitivePath('src/repair/OpenRouterRepairProposalProvider.ts'),
  'Detector should not mark normal source path sensitive.',
);

const customDetector = new SecretLeakDetector({
  additionalSensitivePathFragments: ['runtime-secret-store'],
  additionalSecretKeyFragments: ['runtime_master_key'],
});

assert(
  customDetector.isSensitivePath('.runtime/runtime-secret-store/data.json'),
  'Detector should support custom sensitive path fragments.',
);

const customKeyScan = customDetector.scanText({
  source: 'custom-policy',
  content: 'runtime_master_key = abcdefghijklmnop',
});

assert(!customKeyScan.safe, 'Custom sensitive key fragment should fail scan.');
assert(
  customKeyScan.findings.some((finding) => finding.code === 'SECRET_SENSITIVE_KEY_VALUE'),
  'Custom sensitive key should produce key/value finding.',
);

for (const finding of openRouterKeyScan.findings) {
  assert(
    !finding.evidence?.includes('secret-should-not-leak'),
    'Finding evidence must not leak detected secret material.',
  );
}

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'security-secret-leak-detector-test',
      findingsChecked:
        openRouterKeyScan.findings.length +
        bearerScan.findings.length +
        privateKeyScan.findings.length +
        jsonFieldScan.findings.length +
        credentialUrlScan.findings.length +
        sensitivePathScan.findings.length +
        customKeyScan.findings.length,
    },
    null,
    2,
  ),
);
