import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { RuntimeArtifactStore } from '../artifacts/RuntimeArtifactStore.js';
import { RuntimeArchiveManager } from '../maintenance/RuntimeArchiveManager.js';
import { RuntimeDataInventory } from '../maintenance/RuntimeDataInventory.js';

interface PackageJson {
  scripts?: Record<string, string>;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function readPackageJson(): PackageJson {
  return JSON.parse(readFileSync(path.resolve('package.json'), 'utf8')) as PackageJson;
}

function requireFile(relativePath: string): void {
  assert(existsSync(path.resolve(relativePath)), `Expected file to exist: ${relativePath}`);
}

function requireScript(scripts: Record<string, string>, scriptName: string): string {
  const script = scripts[scriptName];

  assert(script, `Expected package script: ${scriptName}`);

  return script;
}

function requireScriptIncludes(input: {
  scripts: Record<string, string>;
  scriptName: string;
  expected: string;
}): void {
  const script = requireScript(input.scripts, input.scriptName);

  assert(
    script.includes(input.expected),
    `Expected script "${input.scriptName}" to include "${input.expected}". Current: ${script}`,
  );
}

const requiredFiles = [
  'src/maintenance/RuntimeMaintenanceTypes.ts',
  'src/maintenance/RuntimeDataInventory.ts',
  'src/maintenance/RuntimeArchiveManager.ts',
  'src/examples/runtime-data-inventory-test.ts',
  'src/examples/runtime-archive-manager-test.ts',
  'src/examples/runtime-archive-restore-manager-test.ts',
  'src/examples/runtime-artifact-store-archive-filter-test.ts',
  'ui/src/components/settings/RuntimeMaintenancePanel.tsx',
];

for (const file of requiredFiles) {
  requireFile(file);
}

const scripts = readPackageJson().scripts ?? {};

requireScriptIncludes({
  scripts,
  scriptName: 'maintenance:inventory:test',
  expected: 'tsx src/examples/runtime-data-inventory-test.ts',
});

requireScriptIncludes({
  scripts,
  scriptName: 'maintenance:archive:test',
  expected: 'tsx src/examples/runtime-archive-manager-test.ts',
});

requireScriptIncludes({
  scripts,
  scriptName: 'maintenance:restore:test',
  expected: 'tsx src/examples/runtime-archive-restore-manager-test.ts',
});

requireScriptIncludes({
  scripts,
  scriptName: 'artifact-store:archive-filter:test',
  expected: 'tsx src/examples/runtime-artifact-store-archive-filter-test.ts',
});

const runtimeRoot = path.resolve('.runtime/runtime-maintenance-final-lock-test');
const activeSessionId = 'session-real';
const testSessionId = 'session-test-fixture';

await rm(runtimeRoot, {
  recursive: true,
  force: true,
});

await mkdir(path.join(runtimeRoot, 'interactive-sessions', activeSessionId), {
  recursive: true,
});
await mkdir(path.join(runtimeRoot, 'interactive-sessions', testSessionId), {
  recursive: true,
});
await mkdir(path.join(runtimeRoot, 'sandbox-results', testSessionId), {
  recursive: true,
});
await mkdir(path.join(runtimeRoot, 'reports'), {
  recursive: true,
});

await writeFile(
  path.join(runtimeRoot, 'interactive-sessions', activeSessionId, 'session-state.json'),
  JSON.stringify({ id: activeSessionId }),
  'utf8',
);
await writeFile(
  path.join(runtimeRoot, 'interactive-sessions', testSessionId, 'session-state.json'),
  JSON.stringify({ id: testSessionId }),
  'utf8',
);
await writeFile(
  path.join(runtimeRoot, 'sandbox-results', testSessionId, 'sandbox.json'),
  JSON.stringify({ sessionId: testSessionId }),
  'utf8',
);
await writeFile(path.join(runtimeRoot, 'reports', `${activeSessionId}.md`), '# Active\n', 'utf8');
await writeFile(path.join(runtimeRoot, 'reports', `${testSessionId}.md`), '# Test\n', 'utf8');

const inventoryBefore = await new RuntimeDataInventory({
  runtimeRoot,
}).inspect();

assert(inventoryBefore.totals.sessions.total === 2, 'Expected 2 sessions before archive.');
assert(inventoryBefore.totals.sessions.active === 2, 'Expected 2 active sessions before archive.');
assert(
  inventoryBefore.totals.sessions.suspectedTest === 1,
  'Expected 1 suspected test session before archive.',
);

const archiveManager = new RuntimeArchiveManager({
  runtimeRoot,
});

const archiveDryRun = await archiveManager.archiveSessions({
  sessionIds: [testSessionId, testSessionId, ' '],
  dryRun: true,
});

assert(archiveDryRun.dryRun, 'Expected archive dry-run.');
assert(archiveDryRun.results.length === 1, 'Expected deduplicated archive session ids.');
assert(
  archiveDryRun.results[0]?.moved.length === 3,
  'Expected archive dry-run to detect 3 moved paths.',
);

const stillActiveAfterDryRun = await readFile(
  path.join(runtimeRoot, 'interactive-sessions', testSessionId, 'session-state.json'),
  'utf8',
);

assert(stillActiveAfterDryRun.includes(testSessionId), 'Expected dry-run to preserve files.');

const archiveReal = await archiveManager.archiveSessions({
  sessionIds: [testSessionId],
  dryRun: false,
});

assert(archiveReal.results[0]?.archived, 'Expected real archive.');

const inventoryAfterArchive = await new RuntimeDataInventory({
  runtimeRoot,
}).inspect();

assert(
  inventoryAfterArchive.totals.sessions.active === 1,
  'Expected 1 active session after archive.',
);
assert(
  inventoryAfterArchive.totals.sessions.archived === 1,
  'Expected 1 archived session after archive.',
);

const artifactIndexAfterArchive = await new RuntimeArtifactStore({
  rootDir: runtimeRoot,
}).index();

assert(
  artifactIndexAfterArchive.artifacts.every((artifact) => !artifact.path.startsWith('archive/')),
  'Expected main artifact index to hide archived artifacts.',
);
assert(
  artifactIndexAfterArchive.artifacts.some(
    (artifact) => artifact.path === 'reports/session-real.md',
  ),
  'Expected active report to remain indexed.',
);
assert(
  artifactIndexAfterArchive.artifacts.every((artifact) => !artifact.path.includes(testSessionId)),
  'Expected archived test session artifacts to be hidden.',
);

const restoreDryRun = await archiveManager.restoreSessions({
  sessionIds: [testSessionId],
  dryRun: true,
});

assert(restoreDryRun.dryRun, 'Expected restore dry-run.');
assert(
  restoreDryRun.results[0]?.moved.length === 3,
  'Expected restore dry-run to detect 3 moved paths.',
);

const restoreReal = await archiveManager.restoreSessions({
  sessionIds: [testSessionId],
  dryRun: false,
});

assert(restoreReal.results[0]?.restored, 'Expected real restore.');

const inventoryAfterRestore = await new RuntimeDataInventory({
  runtimeRoot,
}).inspect();

assert(
  inventoryAfterRestore.totals.sessions.active === 2,
  'Expected 2 active sessions after restore.',
);
assert(
  inventoryAfterRestore.totals.sessions.archived === 0,
  'Expected 0 archived sessions after restore.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-maintenance-final-lock-test',
      checkedFiles: requiredFiles.length,
      lockedScripts: [
        'maintenance:inventory:test',
        'maintenance:archive:test',
        'maintenance:restore:test',
        'artifact-store:archive-filter:test',
      ],
      lifecycle: {
        before: inventoryBefore.totals.sessions,
        afterArchive: inventoryAfterArchive.totals.sessions,
        afterRestore: inventoryAfterRestore.totals.sessions,
      },
    },
    null,
    2,
  ),
);

await rm(runtimeRoot, {
  recursive: true,
  force: true,
});
