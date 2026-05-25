import { rm } from 'node:fs/promises';
import { SandboxResultStorage } from '../sandbox/SandboxResultStorage.js';
import type { PatchSandboxResult } from '../sandbox/SandboxResult.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

await rm('.runtime/sandbox-results/session-sandbox-storage-test', {
  recursive: true,
  force: true,
});

await rm('.runtime/active-sandbox-result.json', {
  force: true,
});

const storage = new SandboxResultStorage();

const result: PatchSandboxResult = {
  id: 'patch-sandbox-storage-test',
  status: 'passed',
  proposalId: 'proposal-sandbox-storage-test',
  sessionId: 'session-sandbox-storage-test',
  projectRoot: '/tmp/zero-runtime-sandbox-storage-test',
  workspace: null,
  applyResult: null,
  verifyRuns: [],
  issues: [],
  startedAt: '2026-05-25T00:00:00.000Z',
  completedAt: '2026-05-25T00:00:01.000Z',
};

const saved = await storage.save(result);
const loaded = await storage.read(saved.resultPath);
const active = await storage.read(saved.activeResultPath);

assert(
  saved.resultPath.includes('sandbox-results'),
  'Expected result path inside sandbox-results.',
);
assert(
  saved.activeResultPath.endsWith('active-sandbox-result.json'),
  'Expected active sandbox result path.',
);
assert(loaded.id === result.id, 'Expected loaded sandbox result id to match.');
assert(loaded.status === 'passed', 'Expected loaded sandbox result status.');
assert(active.id === result.id, 'Expected active sandbox result id to match.');

console.log(
  JSON.stringify(
    {
      message: 'Patch sandbox result storage test completed',
      saved,
      loaded,
      active,
    },
    null,
    2,
  ),
);
