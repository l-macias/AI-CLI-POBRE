import type { PatchSandboxResult } from '../sandbox/SandboxResult.js';
import { PatchRecoveryLoop } from '../patches/PatchRecoveryLoop.js';
import { PatchRecoveryStorage } from '../patches/PatchRecoveryStorage.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';
import { rm } from 'node:fs/promises';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const sessionId = 'session-recovery-auto-attempt-test';
const proposalId = 'proposal-recovery-auto-attempt-test';

await rm(`.runtime/patch-recoveries/${sessionId}`, {
  recursive: true,
  force: true,
});

const proposal: RuntimePatchProposal = {
  id: proposalId,
  planId: 'plan-recovery-auto-attempt-test',
  sessionId,
  projectRoot: '/tmp/zero-runtime-recovery-auto-attempt-test',
  summary: 'Validate automatic patch recovery attempt counting.',
  files: [
    {
      path: 'src/value.ts',
      operation: 'modify',
      beforeHash: 'hash-value',
      content: 'export const value: number = "broken";\n',
      reason: 'Introduce failing content for auto attempt recovery test.',
      changesSummary: ['Changes value file in a way that fails verification.'],
      riskLevel: 'low',
      userSelectable: true,
    },
  ],
  risks: [
    {
      code: 'LOW_RISK_PATCH_PROPOSAL',
      level: 'low',
      message: 'Patch proposal is limited to low-impact files.',
      mitigation: 'Still require diff preview and user approval.',
    },
  ],
  verifyCommands: [
    {
      command: 'npm',
      args: ['run', 'typecheck'],
      reason: 'Validate TypeScript after patch.',
      requiresApproval: true,
    },
  ],
  riskLevel: 'low',
  requiresApproval: true,
  status: 'validated',
  createdAt: '2026-05-25T00:00:00.000Z',
};

const failedSandboxResult: PatchSandboxResult = {
  id: 'sandbox-recovery-auto-attempt-test',
  status: 'failed',
  proposalId,
  sessionId,
  projectRoot: proposal.projectRoot,
  workspace: null,
  applyResult: null,
  verifyRuns: [
    {
      command: 'npm run typecheck',
      cwd: '/tmp/workspace',
      status: 'executed',
      exitCode: 1,
      stdoutSummary: 'src/value.ts: Type string is not assignable to number.',
      stderrSummary: '',
      issues: [],
      startedAt: '2026-05-25T00:00:00.000Z',
      completedAt: '2026-05-25T00:00:01.000Z',
      durationMs: 1000,
    },
  ],
  issues: [
    {
      code: 'SANDBOX_VERIFY_FAILED',
      message: 'One or more sandbox verify commands failed.',
      severity: 'error',
    },
  ],
  startedAt: '2026-05-25T00:00:00.000Z',
  completedAt: '2026-05-25T00:00:01.000Z',
};

const storage = new PatchRecoveryStorage();
const loop = new PatchRecoveryLoop();

const firstAttemptNumber =
  (await storage.countAttempts({
    sessionId,
    proposalId,
  })) + 1;

const firstRecovery = loop.prepareRepair({
  originalObjective: 'Fix value export safely.',
  proposal,
  sandboxResult: failedSandboxResult,
  currentAttempt: firstAttemptNumber,
  maxAttempts: 2,
});

await storage.save(firstRecovery);

assert(firstRecovery.status === 'repair_prompt_ready', 'Expected first recovery to be ready.');
assert(firstRecovery.currentAttempt === 1, 'Expected first attempt to be 1.');

const secondAttemptNumber =
  (await storage.countAttempts({
    sessionId,
    proposalId,
  })) + 1;

const secondRecovery = loop.prepareRepair({
  originalObjective: 'Fix value export safely.',
  proposal,
  sandboxResult: {
    ...failedSandboxResult,
    id: 'sandbox-recovery-auto-attempt-test-2',
  },
  currentAttempt: secondAttemptNumber,
  maxAttempts: 2,
});

await storage.save(secondRecovery);

assert(secondRecovery.status === 'repair_prompt_ready', 'Expected second recovery to be ready.');
assert(secondRecovery.currentAttempt === 2, 'Expected second attempt to be 2.');

const thirdAttemptNumber =
  (await storage.countAttempts({
    sessionId,
    proposalId,
  })) + 1;

const thirdRecovery = loop.prepareRepair({
  originalObjective: 'Fix value export safely.',
  proposal,
  sandboxResult: {
    ...failedSandboxResult,
    id: 'sandbox-recovery-auto-attempt-test-3',
  },
  currentAttempt: thirdAttemptNumber,
  maxAttempts: 2,
});

assert(
  thirdRecovery.status === 'max_attempts_reached',
  'Expected third recovery to reach max attempts.',
);
assert(thirdRecovery.currentAttempt === 3, 'Expected third attempt to be 3.');

console.log(
  JSON.stringify(
    {
      message: 'Patch recovery auto attempt test completed',
      firstAttemptNumber,
      secondAttemptNumber,
      thirdAttemptNumber,
      firstRecovery,
      secondRecovery,
      thirdRecovery,
    },
    null,
    2,
  ),
);
