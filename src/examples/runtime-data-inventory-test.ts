import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RuntimeDataInventory } from '../maintenance/RuntimeDataInventory.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const runtimeRoot = path.resolve('.runtime/runtime-data-inventory-test');

await rm(runtimeRoot, {
  recursive: true,
  force: true,
});

await mkdir(path.join(runtimeRoot, 'interactive-sessions', 'session-real'), {
  recursive: true,
});
await mkdir(path.join(runtimeRoot, 'interactive-sessions', 'session-test-fixture'), {
  recursive: true,
});
await mkdir(path.join(runtimeRoot, 'sandbox-results', 'session-test-fixture'), {
  recursive: true,
});
await mkdir(path.join(runtimeRoot, 'reports'), {
  recursive: true,
});

await writeFile(
  path.join(runtimeRoot, 'interactive-sessions', 'session-real', 'session-state.json'),
  '{}',
  'utf8',
);
await writeFile(
  path.join(runtimeRoot, 'interactive-sessions', 'session-test-fixture', 'session-state.json'),
  '{}',
  'utf8',
);
await writeFile(
  path.join(runtimeRoot, 'sandbox-results', 'session-test-fixture', 'sandbox.json'),
  '{}',
  'utf8',
);
await writeFile(path.join(runtimeRoot, 'reports', 'session-real.md'), '# Report\n', 'utf8');

const inventory = await new RuntimeDataInventory({
  runtimeRoot,
}).inspect();

assert(inventory.version === 1, 'Expected inventory version 1.');
assert(inventory.runtimeRoot === runtimeRoot, 'Expected runtime root.');
assert(inventory.totals.files === 4, `Expected 4 files. Received ${inventory.totals.files}.`);
assert(inventory.totals.sessions.total === 2, 'Expected 2 sessions.');
assert(inventory.totals.sessions.suspectedTest === 1, 'Expected 1 suspected test session.');
assert(
  inventory.directories.some(
    (directory) => directory.name === 'interactive-sessions' && directory.fileCount === 2,
  ),
  'Expected interactive-sessions directory inventory.',
);
assert(
  inventory.recommendations.some((recommendation) => recommendation.includes('Archive 1')),
  'Expected archive recommendation.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-data-inventory-test',
      totals: inventory.totals,
      recommendations: inventory.recommendations,
    },
    null,
    2,
  ),
);

await rm(runtimeRoot, {
  recursive: true,
  force: true,
});
