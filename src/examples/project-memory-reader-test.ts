import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ArchitectureFactStore } from '../memory/ArchitectureFactStore.js';
import { ProjectDecisionLog } from '../memory/ProjectDecisionLog.js';
import { ProjectMemoryReader } from '../memory/ProjectMemoryReader.js';
import { ProjectMemoryStore } from '../memory/ProjectMemoryStore.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}
function requireString(value: string | null | undefined, message: string): string {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}
const testRoot = join(process.cwd(), '.runtime/project-memory-reader-test/project');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await mkdir(testRoot, {
  recursive: true,
});

const store = new ProjectMemoryStore({
  projectRoot: testRoot,
  projectName: 'Project Memory Reader Test',
});

const decisions = new ProjectDecisionLog({
  store,
});

const architecture = new ArchitectureFactStore({
  store,
});

await decisions.recordDecision({
  title: 'Runtime authority',
  decision: 'Runtime remains the authority over provider output.',
  rationale: 'Provider output is untrusted and must pass runtime validation.',
  importance: 'critical',
  tags: ['runtime', 'provider'],
});

await architecture.recordFact({
  title: 'Project memory reader',
  summary: 'ProjectMemoryReader converts safe memory into RuntimeContextSource.',
  details: ['It does not execute anything.', 'It only renders already-sanitized memory.'],
  importance: 'high',
  tags: ['memory', 'context'],
});

await architecture.recordConstraint({
  title: 'No secrets in memory context',
  rule: 'Memory context must never expose API keys or env secrets.',
  reason: 'Runtime context can later be included in prompts.',
  importance: 'critical',
  tags: ['memory', 'security'],
  metadata: {
    openRouterApiKey: 'sk-or-v1-secret-should-not-leak',
  },
});

await architecture.rememberKnownFile({
  path: 'src/memory/ProjectMemoryReader.ts',
  summary: 'Reads sanitized project memory and renders context sources.',
  importance: 'high',
  tags: ['memory', 'context'],
});

const reader = new ProjectMemoryReader({
  store,
});

const source = requireValue(await reader.readContextSource(), 'Expected project memory source.');

assert(source.name === '.runtime/project-memory.json', 'Expected project memory source name.');
assert(source.priority === 'medium', 'Expected project memory to use medium priority.');

const sourceContent = requireString(source.content, 'Expected project memory content.');

assert(sourceContent.includes('# Project Memory'), 'Expected rendered project memory heading.');
assert(sourceContent.includes('Runtime authority'), 'Expected decision in memory context.');
assert(sourceContent.includes('ProjectMemoryReader.ts'), 'Expected known file in memory context.');
assert(
  !sourceContent.includes('secret-should-not-leak'),
  'Project memory context must not leak secrets.',
);

const securityOnly = requireValue(
  await reader.readContextSource({
    tags: ['security'],
    minImportance: 'critical',
  }),
  'Expected security memory source.',
);

assert(
  securityOnly.content?.includes('No secrets in memory context') === true,
  'Expected security constraint in filtered source.',
);
assert(
  securityOnly.content?.includes('Project memory reader') === false,
  'Filtered source should exclude unrelated memory.',
);

const memoryFile = await readFile(store.getMemoryFilePath(), 'utf8');

assert(
  !sourceContent.includes('secret-should-not-leak'),
  'Project memory context must not leak secrets.',
);

assert(
  !memoryFile.includes('secret-should-not-leak'),
  'Stored project memory must not leak secrets.',
);

assert(
  memoryFile.includes('[REDACTED]'),
  'Stored project memory should contain redacted placeholders for sanitized metadata.',
);

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'project-memory-reader-test',
      sourceName: source.name,
      sourcePriority: source.priority,
      contentLength: sourceContent.length,
    },
    null,
    2,
  ),
);
