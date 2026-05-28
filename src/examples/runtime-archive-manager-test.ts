import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RuntimeArchiveManager } from '../maintenance/RuntimeArchiveManager.js';
import { RuntimeDataInventory } from '../maintenance/RuntimeDataInventory.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const runtimeRoot = path.resolve('.runtime/runtime-archive-manager-test');
const sessionId = 'session-test-fixture';

await rm(runtimeRoot, {
  recursive: true,
  force: true,
});

await mkdir(path.join(runtimeRoot, 'interactive-sessions', sessionId), {
  recursive: true,
});
await mkdir(path.join(runtimeRoot, 'sandbox-results', sessionId), {
  recursive: true,
});
await mkdir(path.join(runtimeRoot, 'reports'), {
  recursive: true,
});

await writeFile(
  path.join(runtimeRoot, 'interactive-sessions', sessionId, 'session-state.json'),
  JSON.stringify({ id: sessionId }),
  'utf8',
);
await writeFile(
  path.join(runtimeRoot, 'sandbox-results', sessionId, 'sandbox.json'),
  JSON.stringify({ sessionId }),
  'utf8',
);
await writeFile(path.join(runtimeRoot, 'reports', `${sessionId}.md`), '# Report\n', 'utf8');

const archiveManager = new RuntimeArchiveManager({
  runtimeRoot,
});

const dryRun = await archiveManager.archiveSessions({
  sessionIds: [sessionId],
  dryRun: true,
});

assert(dryRun.dryRun, 'Expected dry-run archive.');
assert(dryRun.results[0]?.moved.length === 3, 'Expected dry-run to detect 3 moved paths.');

const originalSessionState = await readFile(
  path.join(runtimeRoot, 'interactive-sessions', sessionId, 'session-state.json'),
  'utf8',
);

assert(originalSessionState.includes(sessionId), 'Expected dry-run to preserve original file.');

const archived = await archiveManager.archiveSessions({
  sessionIds: [sessionId],
  dryRun: false,
});

assert(!archived.dryRun, 'Expected real archive.');
assert(archived.results[0]?.archived, 'Expected session to be archived.');
assert(archived.results[0]?.moved.length === 3, 'Expected 3 archived paths.');

const inventory = await new RuntimeDataInventory({
  runtimeRoot,
}).inspect();

assert(inventory.totals.sessions.archived === 1, 'Expected archived session in inventory.');
assert(inventory.totals.sessions.active === 0, 'Expected no active sessions after archive.');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-archive-manager-test',
      dryRunMoved: dryRun.results[0]?.moved.length ?? 0,
      archivedMoved: archived.results[0]?.moved.length ?? 0,
      totals: inventory.totals,
    },
    null,
    2,
  ),
);

await rm(runtimeRoot, {
  recursive: true,
  force: true,
});
