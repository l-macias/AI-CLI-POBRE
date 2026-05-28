import { rm } from 'node:fs/promises';
import type { PatchRecoveryLoopResult } from '../patches/PatchRecoveryLoop.js';
import { PatchRecoveryStorage } from '../patches/PatchRecoveryStorage.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

await rm('.runtime/patch-recoveries/session-recovery-attempts-test', {
  recursive: true,
  force: true,
});

await rm('.runtime/active-patch-recovery.json', {
  force: true,
});

const storage = new PatchRecoveryStorage();

const firstRecovery: PatchRecoveryLoopResult = {
  id: 'patch-recovery-attempts-test-1',
  status: 'repair_prompt_ready',
  proposalId: 'proposal-recovery-attempts-test',
  sessionId: 'session-recovery-attempts-test',
  currentAttempt: 1,
  maxAttempts: 2,
  attempts: [
    {
      attemptNumber: 1,
      proposalId: 'proposal-recovery-attempts-test',
      sandboxResultId: 'sandbox-1',
      failureReport: {
        id: 'failure-1',
        status: 'failed',
        proposalId: 'proposal-recovery-attempts-test',
        planId: 'plan-1',
        sessionId: 'session-recovery-attempts-test',
        projectRoot: '/tmp/project',
        summary: 'First failure.',
        failedFiles: ['src/a.ts'],
        sandboxResultId: 'sandbox-1',
        sandboxStatus: 'failed',
        sandboxIssues: [],
        applyStatus: 'not_applied',
        verifyFailures: [],
        originalPatchSummary: {
          fileCount: 1,
          riskLevel: 'low',
          files: [],
        },
        createdAt: '2026-05-25T00:00:00.000Z',
      },
      repairPrompt: {
        system: 'system',
        user: 'user',
        constraints: [],
        metadata: {
          proposalId: 'proposal-recovery-attempts-test',
          failureReportId: 'failure-1',
          sessionId: 'session-recovery-attempts-test',
          currentAttempt: 1,
          maxAttempts: 2,
        },
      },
      createdAt: '2026-05-25T00:00:00.000Z',
    },
  ],
  issues: [],
  createdAt: '2026-05-25T00:00:00.000Z',
};

const secondRecovery: PatchRecoveryLoopResult = {
  ...firstRecovery,
  id: 'patch-recovery-attempts-test-2',
  currentAttempt: 2,
  attempts: [
    {
      ...firstRecovery.attempts[0]!,
      attemptNumber: 2,
      sandboxResultId: 'sandbox-2',
      createdAt: '2026-05-25T00:00:01.000Z',
    },
  ],
  createdAt: '2026-05-25T00:00:01.000Z',
};

const otherProposalRecovery: PatchRecoveryLoopResult = {
  ...firstRecovery,
  id: 'patch-recovery-attempts-other-proposal-test',
  proposalId: 'proposal-other',
  attempts: [],
  createdAt: '2026-05-25T00:00:02.000Z',
};

await storage.save(firstRecovery);
await storage.save(secondRecovery);
await storage.save(otherProposalRecovery);

const list = await storage.listByProposal({
  sessionId: 'session-recovery-attempts-test',
  proposalId: 'proposal-recovery-attempts-test',
});

assert(list.length === 2, 'Expected two recoveries for target proposal.');
assert(list[0]?.id === firstRecovery.id, 'Expected first recovery ordered first.');
assert(list[1]?.id === secondRecovery.id, 'Expected second recovery ordered second.');

const latest = await storage.findLatestByProposal({
  sessionId: 'session-recovery-attempts-test',
  proposalId: 'proposal-recovery-attempts-test',
});

assert(latest?.id === secondRecovery.id, 'Expected latest recovery to be second recovery.');

const attempts = await storage.countAttempts({
  sessionId: 'session-recovery-attempts-test',
  proposalId: 'proposal-recovery-attempts-test',
});

assert(attempts === 2, 'Expected two total recovery attempts.');

const missingAttempts = await storage.countAttempts({
  sessionId: 'session-recovery-attempts-test',
  proposalId: 'proposal-missing',
});

assert(missingAttempts === 0, 'Expected zero attempts for missing proposal.');

console.log(
  JSON.stringify(
    {
      message: 'Patch recovery storage attempts test completed',
      list,
      latest,
      attempts,
      missingAttempts,
    },
    null,
    2,
  ),
);
