import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ArchitectureFactStore } from '../memory/ArchitectureFactStore.js';
import { ProjectDecisionLog } from '../memory/ProjectDecisionLog.js';
import { ProjectMemoryStore } from '../memory/ProjectMemoryStore.js';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function requireFirstEntry<T>(items: readonly T[], message: string): T {
  const first = items[0];

  if (first === undefined) {
    throw new Error(message);
  }

  return first;
}

const testRoot = join(process.cwd(), '.runtime/project-memory-architecture-test/project');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await mkdir(testRoot, {
  recursive: true,
});

const store = new ProjectMemoryStore({
  projectRoot: testRoot,
  projectName: 'Project Memory Architecture Test',
});

const decisions = new ProjectDecisionLog({
  store,
});

const architecture = new ArchitectureFactStore({
  store,
});

await decisions.recordDecision({
  title: 'Runtime authority over provider output',
  decision: 'Provider output is always treated as untrusted input.',
  rationale:
    'Zero Runtime must remain deterministic and auditable. The model proposes, but runtime validates and decides.',
  alternatives: [
    'Let provider directly emit executable actions.',
    'Trust provider JSON after superficial parsing.',
  ],
  consequences: [
    'All provider output must pass normalization, parser, schema validation, and safety checks.',
    'Repair and agent flows stay slower but safer and more auditable.',
  ],
  importance: 'critical',
  trustLevel: 'user-approved',
  tags: ['runtime-authority', 'provider'],
  metadata: {
    openRouterApiKey: 'sk-or-v1-secret-should-not-leak',
  },
});

await architecture.recordFact({
  title: 'Provider adapter boundary',
  summary: 'OpenRouter is one adapter, not the long-term provider policy owner.',
  details: [
    'Model selection should come from CLI, workspace config, provider strategy, or policy.',
    'Adapters should be replaceable with similar providers.',
  ],
  importance: 'high',
  trustLevel: 'runtime-generated',
  tags: ['provider', 'adapter'],
  source: 'src/providers/OpenRouterClient.ts',
});

await architecture.recordConstraint({
  title: 'No accidental paid provider calls',
  rule: 'Real provider calls require explicit CLI opt-in and environment opt-in before any network call is possible.',
  reason:
    'A runtime-centered coding agent must prevent hidden costs, accidental API use, and unreviewed model calls.',
  enforcement: [
    '--allow-real-provider is required for CLI repair OpenRouter usage.',
    'ZERO_OPENROUTER_ENABLED=1 is required by config loader.',
    'Normal tests must use fake clients and never call network.',
  ],
  importance: 'critical',
  trustLevel: 'runtime-generated',
  tags: ['provider', 'security', 'cost'],
});

await architecture.rememberKnownFile({
  path: 'src/repair/OpenRouterRepairProposalProvider.ts',
  summary:
    'Repair proposal provider that calls OpenRouter client, normalizes response, parses PatchProposal, and returns a validated proposal result.',
  importance: 'high',
  trustLevel: 'runtime-generated',
  tags: ['repair', 'provider'],
});

const document = await store.load();

assert(document.entries.length === 3, 'Expected three memory entries.');
assert(document.knownFiles.length === 1, 'Expected one known architecture file.');
assert(
  document.entries.some((entry) => entry.trustLevel === 'user-approved'),
  'Expected user-approved decision memory.',
);
assert(
  document.entries.filter((entry) => entry.trustLevel === 'runtime-generated').length === 2,
  'Expected two runtime-generated architecture entries.',
);

const decisionQuery = await decisions.queryDecisions({
  tags: ['provider'],
  minImportance: 'high',
});

assert(decisionQuery.entries.length === 1, 'Expected one provider-related decision.');
assert(
  decisionQuery.entries[0]?.kind === 'decision',
  'Decision query should only return decisions.',
);

const firstDecision = requireFirstEntry(
  decisionQuery.entries,
  'Expected first provider-related decision.',
);

assert(
  firstDecision.content.includes('Runtime validates and decides') ||
    firstDecision.content.includes('runtime validates and decides'),
  'Decision content should preserve rationale.',
);

const architectureQuery = await architecture.queryArchitectureMemory({
  tags: ['provider'],
  minImportance: 'high',
});

assert(
  architectureQuery.entries.length >= 2,
  'Architecture query should return provider-related high-importance entries.',
);
assert(
  architectureQuery.knownFiles.length === 1,
  'Architecture query should include provider known file.',
);

const memoryFile = await readFile(store.getMemoryFilePath(), 'utf8');

assert(
  !memoryFile.includes('secret-should-not-leak'),
  'Architecture memory must not leak API-key-like secrets.',
);
assert(memoryFile.includes('[REDACTED]'), 'Architecture memory should redact sensitive metadata.');
assert(
  memoryFile.includes('runtime-authority'),
  'Architecture memory should preserve normalized decision tags.',
);
assert(
  memoryFile.includes('known-file'),
  'Architecture memory should tag known files consistently.',
);
assert(memoryFile.includes('"trustLevel"'), 'Architecture memory should persist trust levels.');

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'project-memory-architecture-test',
      memoryFile: store.getMemoryFilePath(),
      entries: document.entries.length,
      knownFiles: document.knownFiles.length,
    },
    null,
    2,
  ),
);
