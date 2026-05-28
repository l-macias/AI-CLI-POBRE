import { PatchApplyAuthorization } from '../approval/PatchApplyAuthorization.js';
import { PatchDiffBuilder } from '../diff/PatchDiffBuilder.js';
import type { ApprovalDecisionResult } from '../approval/ApprovalRequest.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';
import type { PatchSandboxResult } from '../sandbox/SandboxResult.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function createProposal(input: { id: string; content: string }): RuntimePatchProposal {
  return {
    id: input.id,
    planId: 'plan-old-sandbox-test',
    sessionId: 'session-old-sandbox-test',
    projectRoot: '/tmp/zero-runtime-old-sandbox-test',
    summary: 'Validate old sandbox rejection.',
    files: [
      {
        path: 'src/value.ts',
        operation: 'modify',
        beforeHash: 'hash-value',
        content: input.content,
        reason: 'Update value file.',
        changesSummary: ['Updates value file.'],
        riskLevel: 'low',
        userSelectable: true,
      },
    ],
    risks: [
      {
        code: 'LOW_RISK_PATCH_PROPOSAL',
        level: 'low',
        message: 'Low risk patch.',
        mitigation: 'Still requires approval and sandbox.',
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

const oldProposal = createProposal({
  id: 'proposal-before-repair',
  content: 'export const value: number = "broken";\n',
});

const repairedProposal = createProposal({
  id: 'proposal-after-repair',
  content: 'export const value = 2;\n',
});

const oldDiff = new PatchDiffBuilder().build({
  proposal: oldProposal,
}).diff;

const repairedDiff = new PatchDiffBuilder().build({
  proposal: repairedProposal,
}).diff;

const oldApproval: ApprovalDecisionResult = {
  requestId: `approval-patch-${oldProposal.id}`,
  action: 'approve',
  accepted: true,
  selectedFilePaths: ['src/value.ts'],
  decidedAt: '2026-05-26T00:00:00.000Z',
};

const repairedApproval: ApprovalDecisionResult = {
  requestId: `approval-patch-${repairedProposal.id}`,
  action: 'approve',
  accepted: true,
  selectedFilePaths: ['src/value.ts'],
  decidedAt: '2026-05-26T00:00:01.000Z',
};

const oldAuthorization = new PatchApplyAuthorization().authorize({
  proposal: oldProposal,
  diff: oldDiff,
  decision: oldApproval,
});

assert(oldAuthorization.authorized, 'Expected old proposal authorization to be valid.');

const repairedAuthorization = new PatchApplyAuthorization().authorize({
  proposal: repairedProposal,
  diff: repairedDiff,
  decision: repairedApproval,
});

assert(repairedAuthorization.authorized, 'Expected repaired proposal authorization to be valid.');

const oldPassedSandbox: PatchSandboxResult = {
  id: 'sandbox-old-proposal-passed',
  status: 'passed',
  proposalId: oldProposal.id,
  sessionId: oldProposal.sessionId,
  projectRoot: oldProposal.projectRoot,
  workspace: null,
  applyResult: null,
  verifyRuns: [],
  issues: [],
  startedAt: '2026-05-26T00:00:00.000Z',
  completedAt: '2026-05-26T00:00:01.000Z',
};

const oldSandboxAgainstOldProposal = validateSandboxGate({
  proposal: oldProposal,
  diffProposalId: oldDiff.proposalId,
  sandboxResult: oldPassedSandbox,
});

assert(oldSandboxAgainstOldProposal.accepted, 'Expected old sandbox to match old proposal/diff.');

const oldSandboxAgainstRepairedProposal = validateSandboxGate({
  proposal: repairedProposal,
  diffProposalId: repairedDiff.proposalId,
  sandboxResult: oldPassedSandbox,
});

assert(
  !oldSandboxAgainstRepairedProposal.accepted,
  'Expected old sandbox to be rejected for repaired proposal.',
);
assert(
  oldSandboxAgainstRepairedProposal.issues.includes('SANDBOX_PROPOSAL_ID_MISMATCH'),
  'Expected old sandbox proposal mismatch.',
);
assert(
  oldSandboxAgainstRepairedProposal.issues.includes('SANDBOX_DIFF_PROPOSAL_ID_MISMATCH'),
  'Expected old sandbox diff proposal mismatch.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'patch-apply-rejects-old-sandbox-test',
      oldSandboxAgainstOldProposal,
      oldSandboxAgainstRepairedProposal,
    },
    null,
    2,
  ),
);
