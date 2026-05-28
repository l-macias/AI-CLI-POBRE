import { PatchApplyAuthorization } from '../approval/PatchApplyAuthorization.js';
import type { ApprovalDecisionResult } from '../approval/ApprovalRequest.js';
import { PatchDiffBuilder } from '../diff/PatchDiffBuilder.js';
import { PatchRecoveryLoop } from '../patches/PatchRecoveryLoop.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';
import type { PatchSandboxResult } from '../sandbox/SandboxResult.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function createProposal(input: {
  id: string;
  content: string;
  reason: string;
}): RuntimePatchProposal {
  return {
    id: input.id,
    planId: 'plan-repaired-new-sandbox-test',
    sessionId: 'session-repaired-new-sandbox-test',
    projectRoot: '/tmp/zero-runtime-repaired-new-sandbox-test',
    summary: 'Validate repaired proposal apply after new sandbox.',
    files: [
      {
        path: 'src/value.ts',
        operation: 'modify',
        beforeHash: 'hash-value',
        content: input.content,
        reason: input.reason,
        changesSummary: [input.reason],
        riskLevel: 'low',
        userSelectable: true,
      },
    ],
    risks: [
      {
        code: 'LOW_RISK_PATCH_PROPOSAL',
        level: 'low',
        message: 'Low risk patch.',
        mitigation: 'Still requires fresh approval and sandbox.',
      },
    ],
    verifyCommands: [
      {
        command: 'npm',
        args: ['run', 'typecheck'],
        reason: 'Validate TypeScript before apply.',
        requiresApproval: true,
      },
    ],
    riskLevel: 'low',
    requiresApproval: true,
    status: 'validated',
    createdAt: '2026-05-26T00:00:00.000Z',
  };
}

function validateSandboxGate(input: {
  proposal: RuntimePatchProposal;
  diffProposalId: string;
  sandboxResult: PatchSandboxResult;
}): {
  accepted: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (input.sandboxResult.status !== 'passed') {
    issues.push('SANDBOX_NOT_PASSED');
  }

  if (input.sandboxResult.proposalId !== input.proposal.id) {
    issues.push('SANDBOX_PROPOSAL_ID_MISMATCH');
  }

  if (input.sandboxResult.proposalId !== input.diffProposalId) {
    issues.push('SANDBOX_DIFF_PROPOSAL_ID_MISMATCH');
  }

  if (input.sandboxResult.sessionId !== input.proposal.sessionId) {
    issues.push('SANDBOX_SESSION_ID_MISMATCH');
  }

  if (input.sandboxResult.projectRoot !== input.proposal.projectRoot) {
    issues.push('SANDBOX_PROJECT_ROOT_MISMATCH');
  }

  return {
    accepted: issues.length === 0,
    issues,
  };
}

const originalProposal = createProposal({
  id: 'proposal-repaired-flow-original',
  content: 'export const value: number = "broken";\n',
  reason: 'Original broken patch before recovery.',
});

const failedSandbox: PatchSandboxResult = {
  id: 'sandbox-repaired-flow-original-failed',
  status: 'failed',
  proposalId: originalProposal.id,
  sessionId: originalProposal.sessionId,
  projectRoot: originalProposal.projectRoot,
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
      startedAt: '2026-05-26T00:00:00.000Z',
      completedAt: '2026-05-26T00:00:01.000Z',
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
  startedAt: '2026-05-26T00:00:00.000Z',
  completedAt: '2026-05-26T00:00:01.000Z',
};

const recovery = new PatchRecoveryLoop().prepareRepair({
  originalObjective: 'Fix value export safely.',
  proposal: originalProposal,
  sandboxResult: failedSandbox,
  currentAttempt: 1,
  maxAttempts: 2,
});

assert(recovery.status === 'repair_prompt_ready', 'Expected recovery prompt to be ready.');

const repairedProposal = createProposal({
  id: 'proposal-repaired-flow-fixed',
  content: 'export const value = 2;\n',
  reason: 'Repaired patch after sandbox failure.',
});

const repairedDiff = new PatchDiffBuilder().build({
  proposal: repairedProposal,
}).diff;

const freshApproval: ApprovalDecisionResult = {
  requestId: `approval-patch-${repairedProposal.id}`,
  action: 'approve',
  accepted: true,
  selectedFilePaths: ['src/value.ts'],
  decidedAt: '2026-05-26T00:00:02.000Z',
};

const repairedAuthorization = new PatchApplyAuthorization().authorize({
  proposal: repairedProposal,
  diff: repairedDiff,
  decision: freshApproval,
});

assert(repairedAuthorization.authorized, 'Expected repaired proposal with fresh approval.');

const oldFailedSandboxGate = validateSandboxGate({
  proposal: repairedProposal,
  diffProposalId: repairedDiff.proposalId,
  sandboxResult: failedSandbox,
});

assert(
  !oldFailedSandboxGate.accepted,
  'Expected failed original sandbox to be rejected for repaired proposal.',
);
assert(
  oldFailedSandboxGate.issues.includes('SANDBOX_NOT_PASSED'),
  'Expected old failed sandbox status issue.',
);
assert(
  oldFailedSandboxGate.issues.includes('SANDBOX_PROPOSAL_ID_MISMATCH'),
  'Expected old failed sandbox proposal mismatch.',
);

const newPassedSandbox: PatchSandboxResult = {
  id: 'sandbox-repaired-flow-passed',
  status: 'passed',
  proposalId: repairedProposal.id,
  sessionId: repairedProposal.sessionId,
  projectRoot: repairedProposal.projectRoot,
  workspace: null,
  applyResult: null,
  verifyRuns: [],
  issues: [],
  startedAt: '2026-05-26T00:00:03.000Z',
  completedAt: '2026-05-26T00:00:04.000Z',
};

const newPassedSandboxGate = validateSandboxGate({
  proposal: repairedProposal,
  diffProposalId: repairedDiff.proposalId,
  sandboxResult: newPassedSandbox,
});

assert(
  newPassedSandboxGate.accepted,
  'Expected repaired proposal to pass with fresh matching sandbox.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'patch-apply-allows-repaired-proposal-after-new-sandbox-test',
      recoveryStatus: recovery.status,
      repairedAuthorized: repairedAuthorization.authorized,
      oldFailedSandboxGate,
      newPassedSandboxGate,
    },
    null,
    2,
  ),
);
