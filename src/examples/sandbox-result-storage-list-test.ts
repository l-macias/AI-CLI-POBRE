import { rm } from 'node:fs/promises';
import type { PatchSandboxResult } from '../sandbox/SandboxResult.js';
import { SandboxResultStorage } from '../sandbox/SandboxResultStorage.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

await rm('.runtime/sandbox-results/session-sandbox-list-test', {
  recursive: true,
  force: true,
});

const storage = new SandboxResultStorage();

const first: PatchSandboxResult = {
  id: 'sandbox-list-test-1',
  status: 'failed',
  proposalId: 'proposal-list-test',
  sessionId: 'session-sandbox-list-test',
  projectRoot: '/tmp/project',
  workspace: null,
  applyResult: null,
  verifyRuns: [],
  issues: [],
  startedAt: '2026-05-25T00:00:00.000Z',
  completedAt: '2026-05-25T00:00:01.000Z',
};

const second: PatchSandboxResult = {
  ...first,
  id: 'sandbox-list-test-2',
  status: 'passed',
  startedAt: '2026-05-25T00:00:02.000Z',
  completedAt: '2026-05-25T00:00:03.000Z',
};

await storage.save(second);
await storage.save(first);

const list = await storage.listBySession('session-sandbox-list-test');

assert(list.length === 2, 'Expected two sandbox results.');
assert(list[0]?.id === first.id, 'Expected first result ordered first.');
assert(list[1]?.id === second.id, 'Expected second result ordered second.');

const missing = await storage.listBySession('session-sandbox-missing-test');

assert(missing.length === 0, 'Expected missing session to return empty list.');

console.log(
  JSON.stringify(
    {
      message: 'Sandbox result storage list test completed',
      list,
      missing,
    },
    null,
    2,
  ),
);
