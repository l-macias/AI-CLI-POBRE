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

function assertSandboxMatches(input: {
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

  if (input.sandboxResult.sessionId !== input.proposal.sessionId) {
    issues.push('SANDBOX_SESSION_ID_MISMATCH');
  }

  if (input.sandboxResult.projectRoot !== input.proposal.projectRoot) {
    issues.push('SANDBOX_PROJECT_ROOT_MISMATCH');
  }

  if (input.sandboxResult.proposalId !== input.diffProposalId) {
    issues.push('SANDBOX_DIFF_PROPOSAL_ID_MISMATCH');
  }

  return {
    accepted: issues.length === 0,
    issues,
  };
}

const proposal: RuntimePatchProposal = {
  id: 'proposal-current-sandbox-gate-test',
  planId: 'plan-current-sandbox-gate-test',
  sessionId: 'session-current-sandbox-gate-test',
  projectRoot: '/tmp/zero-runtime-current-sandbox-gate-test',
  summary: 'Validate sandbox/proposal matching before apply.',
  files: [
    {
      path: 'src/value.ts',
      operation: 'modify',
      beforeHash: 'hash-value',
      content: 'export const value = 2;\n',
      reason: 'Update value for sandbox gate test.',
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
      mitigation: 'Still requires approval and passed sandbox.',
    },
  ],
  verifyCommands: [
    {
      command: 'npm',
      args: ['run', 'typecheck'],
      reason: 'Validate TypeScript before real apply.',
      requiresApproval: true,
    },
  ],
  riskLevel: 'low',
  requiresApproval: true,
  status: 'validated',
  createdAt: '2026-05-26T00:00:00.000Z',
};

const diff = new PatchDiffBuilder().build({
  proposal,
}).diff;

const decision: ApprovalDecisionResult = {
  requestId: `approval-patch-${proposal.id}`,
  action: 'approve',
  accepted: true,
  selectedFilePaths: ['src/value.ts'],
  decidedAt: '2026-05-26T00:00:00.000Z',
};

const authorization = new PatchApplyAuthorization().authorize({
  proposal,
  diff,
  decision,
});

assert(authorization.authorized, 'Expected matching proposal/diff/approval to authorize apply.');

const passedSandbox: PatchSandboxResult = {
  id: 'sandbox-current-passed',
  status: 'passed',
  proposalId: proposal.id,
  sessionId: proposal.sessionId,
  projectRoot: proposal.projectRoot,
  workspace: null,
  applyResult: null,
  verifyRuns: [],
  issues: [],
  startedAt: '2026-05-26T00:00:00.000Z',
  completedAt: '2026-05-26T00:00:01.000Z',
};

const matchingSandbox = assertSandboxMatches({
  proposal,
  diffProposalId: diff.proposalId,
  sandboxResult: passedSandbox,
});

assert(matchingSandbox.accepted, 'Expected matching sandbox to be accepted.');

const wrongProposalSandbox = assertSandboxMatches({
  proposal,
  diffProposalId: diff.proposalId,
  sandboxResult: {
    ...passedSandbox,
    id: 'sandbox-wrong-proposal',
    proposalId: 'proposal-old-or-wrong',
  },
});

assert(!wrongProposalSandbox.accepted, 'Expected wrong proposal sandbox to be rejected.');
assert(
  wrongProposalSandbox.issues.includes('SANDBOX_PROPOSAL_ID_MISMATCH'),
  'Expected SANDBOX_PROPOSAL_ID_MISMATCH issue.',
);
assert(
  wrongProposalSandbox.issues.includes('SANDBOX_DIFF_PROPOSAL_ID_MISMATCH'),
  'Expected SANDBOX_DIFF_PROPOSAL_ID_MISMATCH issue.',
);

const wrongSessionSandbox = assertSandboxMatches({
  proposal,
  diffProposalId: diff.proposalId,
  sandboxResult: {
    ...passedSandbox,
    id: 'sandbox-wrong-session',
    sessionId: 'session-wrong',
  },
});

assert(!wrongSessionSandbox.accepted, 'Expected wrong session sandbox to be rejected.');
assert(
  wrongSessionSandbox.issues.includes('SANDBOX_SESSION_ID_MISMATCH'),
  'Expected SANDBOX_SESSION_ID_MISMATCH issue.',
);

const wrongProjectSandbox = assertSandboxMatches({
  proposal,
  diffProposalId: diff.proposalId,
  sandboxResult: {
    ...passedSandbox,
    id: 'sandbox-wrong-project',
    projectRoot: '/tmp/wrong-project-root',
  },
});

assert(!wrongProjectSandbox.accepted, 'Expected wrong project sandbox to be rejected.');
assert(
  wrongProjectSandbox.issues.includes('SANDBOX_PROJECT_ROOT_MISMATCH'),
  'Expected SANDBOX_PROJECT_ROOT_MISMATCH issue.',
);

const failedSandbox = assertSandboxMatches({
  proposal,
  diffProposalId: diff.proposalId,
  sandboxResult: {
    ...passedSandbox,
    id: 'sandbox-failed',
    status: 'failed',
  },
});

assert(!failedSandbox.accepted, 'Expected failed sandbox to be rejected.');
assert(failedSandbox.issues.includes('SANDBOX_NOT_PASSED'), 'Expected SANDBOX_NOT_PASSED issue.');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'patch-apply-rejects-wrong-proposal-sandbox-test',
      matchingSandbox,
      wrongProposalSandbox,
      wrongSessionSandbox,
      wrongProjectSandbox,
      failedSandbox,
    },
    null,
    2,
  ),
);
