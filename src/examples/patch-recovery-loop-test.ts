import type { PatchSandboxResult } from '../sandbox/SandboxResult.js';
import { PatchRecoveryLoop } from '../patches/PatchRecoveryLoop.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const proposal: RuntimePatchProposal = {
  id: 'proposal-recovery-loop-test',
  planId: 'plan-recovery-loop-test',
  sessionId: 'session-recovery-loop-test',
  projectRoot: '/tmp/zero-runtime-recovery-loop-test',
  summary: 'Validate patch recovery loop.',
  files: [
    {
      path: 'src/value.ts',
      operation: 'modify',
      beforeHash: 'hash-value',
      content: 'export const value: number = "broken";\n',
      reason: 'Introduce failing content for recovery loop test.',
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
  id: 'sandbox-recovery-loop-test',
  status: 'failed',
  proposalId: proposal.id,
  sessionId: proposal.sessionId,
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

const loop = new PatchRecoveryLoop();

const result = loop.prepareRepair({
  originalObjective: 'Fix value export safely.',
  proposal,
  sandboxResult: failedSandboxResult,
  currentAttempt: 1,
  maxAttempts: 2,
});

assert(result.status === 'repair_prompt_ready', 'Expected recovery prompt to be ready.');
assert(result.attempts.length === 1, 'Expected one recovery attempt.');
assert(result.issues.length === 0, 'Expected no recovery issues.');

const firstAttempt = result.attempts[0];

if (!firstAttempt) {
  throw new Error('Expected first recovery attempt.');
}

assert(
  firstAttempt.failureReport.verifyFailures.length === 1,
  'Expected failure report to preserve verify failure.',
);

assert(
  firstAttempt.repairPrompt.user.includes('not assignable'),
  'Expected repair prompt to include verify failure output.',
);

const maxAttemptsResult = loop.prepareRepair({
  originalObjective: 'Fix value export safely.',
  proposal,
  sandboxResult: failedSandboxResult,
  currentAttempt: 3,
  maxAttempts: 2,
});

assert(maxAttemptsResult.status === 'max_attempts_reached', 'Expected max attempts to be blocked.');

const passedSandboxResult: PatchSandboxResult = {
  ...failedSandboxResult,
  id: 'sandbox-recovery-loop-passed-test',
  status: 'passed',
  issues: [],
  verifyRuns: [],
};

const passedResult = loop.prepareRepair({
  originalObjective: 'Fix value export safely.',
  proposal,
  sandboxResult: passedSandboxResult,
  currentAttempt: 1,
  maxAttempts: 2,
});

assert(
  passedResult.status === 'not_recoverable',
  'Expected passed sandbox result to be not recoverable.',
);

assert(
  passedResult.issues.some((issue) => issue.code === 'PATCH_RECOVERY_REQUIRES_FAILED_SANDBOX'),
  'Expected failed sandbox requirement issue.',
);

const mismatchResult = loop.prepareRepair({
  originalObjective: 'Fix value export safely.',
  proposal,
  sandboxResult: {
    ...failedSandboxResult,
    proposalId: 'other-proposal',
  },
  currentAttempt: 1,
  maxAttempts: 2,
});

assert(mismatchResult.status === 'not_recoverable', 'Expected mismatch to be not recoverable.');
assert(
  mismatchResult.issues.some((issue) => issue.code === 'PATCH_RECOVERY_PROPOSAL_MISMATCH'),
  'Expected proposal mismatch issue.',
);

console.log(
  JSON.stringify(
    {
      message: 'Patch recovery loop test completed',
      result,
      maxAttemptsResult,
      passedResult,
      mismatchResult,
    },
    null,
    2,
  ),
);
