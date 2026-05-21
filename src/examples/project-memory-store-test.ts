import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ProjectMemoryStore } from '../memory/ProjectMemoryStore.js';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = join(process.cwd(), '.runtime/project-memory-store-test/project');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await mkdir(testRoot, {
  recursive: true,
});

const store = new ProjectMemoryStore({
  projectRoot: testRoot,
  projectName: 'Project Memory Store Test',
});

const initial = await store.load();

assert(initial.version === 1, 'Project memory document should use version 1.');
assert(initial.projectName === 'Project Memory Store Test', 'Project name should be preserved.');
assert(initial.entries.length === 0, 'Initial project memory should have no entries.');
assert(initial.knownFiles.length === 0, 'Initial project memory should have no known files.');

await store.appendFact({
  title: 'Runtime authority',
  content:
    'The runtime is the authority. LLM/provider output is untrusted and must pass validation.',
  importance: 'critical',
  trustLevel: 'user-approved',
  tags: ['architecture', 'runtime'],
});

await store.appendDecision({
  title: 'Provider adapters are not policy owners',
  content:
    'Provider adapters must not hardcode long-term model strategy. Model selection belongs to strategy/config/policy.',
  importance: 'high',
  trustLevel: 'runtime-generated',
  tags: ['provider', 'policy'],
  metadata: {
    provider: 'openrouter',
    apiKey: 'sk-or-v1-secret-should-not-leak',
  },
});

await store.appendConstraint({
  title: 'No accidental provider calls',
  content:
    'Real provider calls require explicit opt-in and must not run in normal tests. OPENROUTER_API_KEY=secret-value',
  importance: 'critical',
  trustLevel: 'runtime-generated',
  tags: ['security', 'provider'],
});

await store.appendSessionNote({
  title: 'Session 42.A started',
  content: 'Created local project memory store for facts, decisions, constraints, and notes.',
  importance: 'medium',
  trustLevel: 'provider-suggested',
  tags: ['session-42'],
});

await store.upsertKnownFile({
  path: 'src/repair/OpenRouterRepairProposalProvider.ts',
  summary:
    'Repair proposal provider that routes OpenRouter text through normalizer, parser, and schema validation.',
  importance: 'high',
  trustLevel: 'runtime-generated',
  tags: ['repair', 'provider'],
});

await store.upsertKnownFile({
  path: 'src/repair/OpenRouterRepairProposalProvider.ts',
  summary: 'Updated summary should replace the previous known file memory entry.',
  importance: 'high',
  trustLevel: 'runtime-generated',
  tags: ['repair', 'provider', 'updated'],
});

const document = await store.load();

assert(document.entries.length === 4, 'Expected four project memory entries.');
assert(document.knownFiles.length === 1, 'Known file should be upserted, not duplicated.');
assert(
  document.entries.some((entry) => entry.trustLevel === 'provider-suggested'),
  'Expected provider-suggested trust level to be stored.',
);
assert(
  document.knownFiles.every((file) => file.trustLevel === 'runtime-generated'),
  'Expected known files to include runtime-generated trust level.',
);
assert(
  document.knownFiles[0]?.summary ===
    'Updated summary should replace the previous known file memory entry.',
  'Known file summary should be updated.',
);

const securityQuery = await store.query({
  tags: ['security'],
  minImportance: 'high',
});

assert(securityQuery.entries.length === 1, 'Expected one high-importance security entry.');
assert(
  securityQuery.entries[0]?.kind === 'constraint',
  'Security query should return the constraint entry.',
);

const providerQuery = await store.query({
  tags: ['provider'],
  minImportance: 'high',
});

assert(providerQuery.entries.length >= 1, 'Provider query should return provider-related entries.');
assert(providerQuery.knownFiles.length === 1, 'Provider query should return known provider file.');

const providerSuggestedQuery = await store.query({
  trustLevels: ['provider-suggested'],
});

assert(
  providerSuggestedQuery.entries.length === 1,
  'Expected provider-suggested query to return one entry.',
);

let blockedEnvPath = false;

try {
  await store.upsertKnownFile({
    path: '.env',
    summary: 'This should never be stored.',
  });
} catch (error) {
  blockedEnvPath =
    error instanceof Error && error.message.includes('refuses to store sensitive path');
}

assert(blockedEnvPath, 'Project memory should refuse to store .env path.');

let blockedRawProviderResponse = false;

try {
  await store.appendFact({
    title: 'Raw provider response',
    content: 'raw provider response: this should never be stored',
  });
} catch (error) {
  blockedRawProviderResponse =
    error instanceof Error && error.message.includes('raw provider responses');
}

assert(blockedRawProviderResponse, 'Project memory should refuse raw provider responses.');

const rawMemoryFile = await readFile(store.getMemoryFilePath(), 'utf8');

assert(
  !rawMemoryFile.includes('secret-should-not-leak'),
  'Project memory file must not contain raw API-key-like secrets.',
);
assert(
  !rawMemoryFile.includes('OPENROUTER_API_KEY=secret-value'),
  'Project memory file must not contain raw env secrets.',
);
assert(
  rawMemoryFile.includes('[REDACTED]'),
  'Project memory should include redacted placeholders.',
);

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'project-memory-store-test',
      memoryFile: store.getMemoryFilePath(),
      entries: document.entries.length,
      knownFiles: document.knownFiles.length,
    },
    null,
    2,
  ),
);
