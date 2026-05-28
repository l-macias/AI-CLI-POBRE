import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RuntimeArchiveManager } from '../maintenance/RuntimeArchiveManager.js';
import { RuntimeDataInventory } from '../maintenance/RuntimeDataInventory.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const runtimeRoot = path.resolve('.runtime/runtime-archive-restore-manager-test');
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

const archived = await archiveManager.archiveSessions({
  sessionIds: [sessionId],
  dryRun: false,
});

assert(archived.results[0]?.archived, 'Expected session to be archived.');

const archivedInventory = await new RuntimeDataInventory({
  runtimeRoot,
}).inspect();

assert(archivedInventory.totals.sessions.archived === 1, 'Expected one archived session.');
assert(archivedInventory.totals.sessions.active === 0, 'Expected zero active sessions.');

const dryRunRestore = await archiveManager.restoreSessions({
  sessionIds: [sessionId],
  dryRun: true,
});

assert(dryRunRestore.dryRun, 'Expected dry-run restore.');
assert(dryRunRestore.results[0]?.moved.length === 3, 'Expected dry-run restore to detect 3 paths.');

const restored = await archiveManager.restoreSessions({
  sessionIds: [sessionId],
  dryRun: false,
});

assert(restored.results[0]?.restored, 'Expected session to be restored.');
assert(restored.results[0]?.moved.length === 3, 'Expected restore to move 3 paths.');

const restoredContent = await readFile(
  path.join(runtimeRoot, 'interactive-sessions', sessionId, 'session-state.json'),
  'utf8',
);

assert(restoredContent.includes(sessionId), 'Expected restored session state.');

const restoredInventory = await new RuntimeDataInventory({
  runtimeRoot,
}).inspect();

assert(
  restoredInventory.totals.sessions.active === 1,
  'Expected one active session after restore.',
);
assert(
  restoredInventory.totals.sessions.archived === 0,
  'Expected zero archived sessions after restore.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-archive-restore-manager-test',
      archivedMoved: archived.results[0]?.moved.length ?? 0,
      dryRunRestoreMoved: dryRunRestore.results[0]?.moved.length ?? 0,
      restoredMoved: restored.results[0]?.moved.length ?? 0,
      totals: restoredInventory.totals,
    },
    null,
    2,
  ),
);

await rm(runtimeRoot, {
  recursive: true,
  force: true,
});
