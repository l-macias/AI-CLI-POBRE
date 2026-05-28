import { PatchApplyAuthorization } from '../approval/PatchApplyAuthorization.js';
import { PatchDiffBuilder } from '../diff/PatchDiffBuilder.js';
import type { ApprovalDecisionResult } from '../approval/ApprovalRequest.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';

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
    planId: 'plan-stale-approval-test',
    sessionId: 'session-stale-approval-test',
    projectRoot: '/tmp/zero-runtime-stale-approval-test',
    summary: 'Validate stale approval rejection after repaired proposal.',
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
        mitigation: 'Still requires approval and sandbox.',
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
}

const originalProposal = createProposal({
  id: 'proposal-original-before-recovery',
  content: 'export const value = "broken";\n',
  reason: 'Original proposal before sandbox failure.',
});

const repairedProposal = createProposal({
  id: 'proposal-repaired-after-recovery',
  content: 'export const value = "fixed";\n',
  reason: 'Repaired proposal after sandbox recovery.',
});

const originalDiff = new PatchDiffBuilder().build({
  proposal: originalProposal,
}).diff;

const repairedDiff = new PatchDiffBuilder().build({
  proposal: repairedProposal,
}).diff;

const staleApproval: ApprovalDecisionResult = {
  requestId: `approval-patch-${originalProposal.id}`,
  action: 'approve',
  accepted: true,
  selectedFilePaths: ['src/value.ts'],
  decidedAt: '2026-05-26T00:00:00.000Z',
};

const originalAuthorization = new PatchApplyAuthorization().authorize({
  proposal: originalProposal,
  diff: originalDiff,
  decision: staleApproval,
});

assert(
  originalAuthorization.authorized,
  'Expected original approval to authorize original proposal.',
);

const staleApprovalAgainstRepairedDiff = new PatchApplyAuthorization().authorize({
  proposal: repairedProposal,
  diff: originalDiff,
  decision: staleApproval,
});

assert(
  !staleApprovalAgainstRepairedDiff.authorized,
  'Expected original diff approval to reject repaired proposal.',
);
assert(
  staleApprovalAgainstRepairedDiff.issues.some(
    (issue) => issue.code === 'DIFF_PROPOSAL_ID_MISMATCH',
  ),
  'Expected DIFF_PROPOSAL_ID_MISMATCH for stale diff/proposal pair.',
);

const repairedAuthorizationWithoutFreshApproval = new PatchApplyAuthorization().authorize({
  proposal: repairedProposal,
  diff: repairedDiff,
  decision: null,
});

assert(
  !repairedAuthorizationWithoutFreshApproval.authorized,
  'Expected repaired proposal to require fresh approval.',
);
assert(
  repairedAuthorizationWithoutFreshApproval.issues.some(
    (issue) => issue.code === 'APPROVAL_DECISION_REQUIRED',
  ),
  'Expected APPROVAL_DECISION_REQUIRED for repaired proposal without approval.',
);

const freshApproval: ApprovalDecisionResult = {
  requestId: `approval-patch-${repairedProposal.id}`,
  action: 'approve',
  accepted: true,
  selectedFilePaths: ['src/value.ts'],
  decidedAt: '2026-05-26T00:00:01.000Z',
};

const repairedAuthorization = new PatchApplyAuthorization().authorize({
  proposal: repairedProposal,
  diff: repairedDiff,
  decision: freshApproval,
});

assert(repairedAuthorization.authorized, 'Expected fresh approval to authorize repaired proposal.');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'patch-apply-rejects-recovery-stale-approval-test',
      originalAuthorized: originalAuthorization.authorized,
      staleApprovalIssues: staleApprovalAgainstRepairedDiff.issues,
      repairedWithoutApprovalIssues: repairedAuthorizationWithoutFreshApproval.issues,
      repairedAuthorized: repairedAuthorization.authorized,
    },
    null,
    2,
  ),
);
