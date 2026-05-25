import { rm } from 'node:fs/promises';
import type { PatchRecoveryLoopResult } from '../patches/PatchRecoveryLoop.js';
import { PatchRecoveryStorage } from '../patches/PatchRecoveryStorage.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

await rm('.runtime/patch-recoveries/session-recovery-storage-test', {
  recursive: true,
  force: true,
});

await rm('.runtime/active-patch-recovery.json', {
  force: true,
});

const storage = new PatchRecoveryStorage();

const result: PatchRecoveryLoopResult = {
  id: 'patch-recovery-storage-test',
  status: 'repair_prompt_ready',
  proposalId: 'proposal-recovery-storage-test',
  sessionId: 'session-recovery-storage-test',
  currentAttempt: 1,
  maxAttempts: 2,
  attempts: [],
  issues: [],
  createdAt: '2026-05-25T00:00:00.000Z',
};

const saved = await storage.save(result);
const loaded = await storage.read(saved.recoveryPath);
const active = await storage.read(saved.activeRecoveryPath);

assert(
  saved.recoveryPath.includes('patch-recoveries'),
  'Expected recovery path inside patch-recoveries.',
);
assert(
  saved.activeRecoveryPath.endsWith('active-patch-recovery.json'),
  'Expected active patch recovery path.',
);
assert(loaded.id === result.id, 'Expected loaded recovery result id to match.');
assert(loaded.status === 'repair_prompt_ready', 'Expected loaded recovery status.');
assert(active.id === result.id, 'Expected active recovery result id to match.');

console.log(
  JSON.stringify(
    {
      message: 'Patch recovery storage test completed',
      saved,
      loaded,
      active,
    },
    null,
    2,
  ),
);
