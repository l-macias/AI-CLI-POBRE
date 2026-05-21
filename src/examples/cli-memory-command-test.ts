import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { CliRunner } from '../cli/CliRunner.js';
import { ProjectMemoryStore } from '../memory/ProjectMemoryStore.js';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = join(process.cwd(), '.runtime/cli-memory-command-test/project');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await mkdir(testRoot, {
  recursive: true,
});

const store = new ProjectMemoryStore({
  projectRoot: testRoot,
  projectName: 'CLI Memory Command Test',
});

await store.appendFact({
  title: 'Runtime authority',
  content: 'The runtime validates provider output before it can affect the project.',
  importance: 'critical',
  trustLevel: 'user-approved',
  tags: ['runtime', 'authority'],
});

await store.appendDecision({
  title: 'Memory review command',
  content: 'The CLI exposes memory list, inspect, and clear commands.',
  importance: 'high',
  trustLevel: 'runtime-generated',
  tags: ['cli', 'memory'],
});

await store.upsertKnownFile({
  path: 'src/memory/ProjectMemoryStore.ts',
  summary: 'Stores sanitized project memory in the runtime directory.',
  importance: 'high',
  trustLevel: 'runtime-generated',
  tags: ['memory'],
});

const runner = new CliRunner();

const listResult = await runner.run(['memory', 'list', '--project', testRoot, '--format', 'json']);

assert(listResult.status === 'ok', 'Expected memory list to succeed.');
assert(listResult.command === 'memory', 'Expected memory command result.');

const listOutput = listResult.output as {
  summary?: {
    entries?: number;
    knownFiles?: number;
    trustLevels?: {
      'user-approved'?: number;
      'runtime-generated'?: number;
      'provider-suggested'?: number;
      quarantined?: number;
    };
  };
  entries?: {
    id?: string;
    trustLevel?: string;
  }[];
};

assert(listOutput.summary?.entries === 2, 'Expected memory list to include two entries.');
assert(listOutput.summary?.knownFiles === 1, 'Expected memory list to include one known file.');
assert(
  listOutput.summary?.trustLevels?.['user-approved'] === 1,
  'Expected memory list to count user-approved memory.',
);
assert(
  listOutput.summary?.trustLevels?.['runtime-generated'] === 2,
  'Expected memory list to count runtime-generated memory.',
);
assert(
  listOutput.entries?.some((entry) => entry.trustLevel === 'user-approved') === true,
  'Expected memory list entries to expose trust level.',
);

const firstEntryId = listOutput.entries?.[0]?.id;

assert(typeof firstEntryId === 'string', 'Expected first memory entry id.');

const inspectResult = await runner.run([
  'memory',
  'inspect',
  firstEntryId,
  '--project',
  testRoot,
  '--format',
  'json',
]);

assert(inspectResult.status === 'ok', 'Expected memory inspect to succeed.');

const inspectOutput = inspectResult.output as {
  selectedEntry?: {
    content?: string;
    trustLevel?: string;
  };
};

assert(
  inspectOutput.selectedEntry?.content?.includes('runtime validates provider output') === true,
  'Expected memory inspect to include sanitized entry content.',
);
assert(
  inspectOutput.selectedEntry?.trustLevel === 'user-approved',
  'Expected memory inspect to include trust level.',
);

const blockedClear = await runner.run([
  'memory',
  'clear',
  '--project',
  testRoot,
  '--format',
  'json',
]);

assert(blockedClear.status === 'error', 'Expected memory clear without confirm to fail.');

const clearResult = await runner.run([
  'memory',
  'clear',
  '--project',
  testRoot,
  '--confirm',
  '--format',
  'json',
]);

assert(clearResult.status === 'ok', 'Expected memory clear with confirm to succeed.');

const cleared = await store.load();

assert(cleared.entries.length === 0, 'Expected cleared memory entries.');
assert(cleared.knownFiles.length === 0, 'Expected cleared known files.');

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'cli-memory-command-test',
      listEntries: listOutput.summary?.entries,
      listKnownFiles: listOutput.summary?.knownFiles,
      memoryFile: store.getMemoryFilePath(),
    },
    null,
    2,
  ),
);
