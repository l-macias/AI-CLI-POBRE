import { ApprovedPatchBuilder } from '../patches/ApprovedPatchBuilder.js';
import { PatchDiffBuilder } from '../diff/PatchDiffBuilder.js';
import { PatchApplyAuthorization } from '../approval/PatchApplyAuthorization.js';
import type { ApprovalDecisionResult } from '../approval/ApprovalRequest.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const proposal: RuntimePatchProposal = {
  id: 'proposal-apply-authorization-test',
  planId: 'plan-apply-authorization-test',
  sessionId: 'session-apply-authorization-test',
  projectRoot: '/tmp/zero-runtime-apply-authorization-test',
  summary: 'Validate patch apply authorization.',
  files: [
    {
      path: 'src/a.ts',
      operation: 'modify',
      beforeHash: 'hash-a',
      content: 'export const a = 2;\n',
      reason: 'Update file A for authorization test.',
      changesSummary: ['Updates file A.'],
      riskLevel: 'medium',
      userSelectable: true,
    },
    {
      path: 'src/b.ts',
      operation: 'modify',
      beforeHash: 'hash-b',
      content: 'export const b = 2;\n',
      reason: 'Update file B for authorization test.',
      changesSummary: ['Updates file B.'],
      riskLevel: 'medium',
      userSelectable: true,
    },
  ],
  risks: [
    {
      code: 'SMALL_MULTI_FILE_PATCH',
      level: 'medium',
      message: 'Patch proposal affects 2 to 5 files.',
      mitigation: 'Require file-level approval, snapshot and verification.',
    },
  ],
  verifyCommands: [
    {
      command: 'npm',
      args: ['run', 'typecheck'],
      reason: 'Validate TypeScript after authorized patch apply.',
      requiresApproval: true,
    },
  ],
  riskLevel: 'medium',
  requiresApproval: true,
  status: 'validated',
  createdAt: '2026-05-25T00:00:00.000Z',
};

const authorization = new PatchApplyAuthorization();

const fullDiff = new PatchDiffBuilder().build({
  proposal,
}).diff;

const approveAllDecision: ApprovalDecisionResult = {
  requestId: `approval-patch-${proposal.id}`,
  action: 'approve',
  accepted: true,
  selectedFilePaths: ['src/a.ts', 'src/b.ts'],
  decidedAt: '2026-05-25T00:00:00.000Z',
};

const approveAllResult = authorization.authorize({
  proposal,
  diff: fullDiff,
  decision: approveAllDecision,
});

assert(approveAllResult.authorized, 'Expected approve-all decision to authorize full diff.');

const missingDecisionResult = authorization.authorize({
  proposal,
  diff: fullDiff,
  decision: null,
});

assert(!missingDecisionResult.authorized, 'Expected missing approval decision to block apply.');
assert(
  missingDecisionResult.issues.some((issue) => issue.code === 'APPROVAL_DECISION_REQUIRED'),
  'Expected APPROVAL_DECISION_REQUIRED issue.',
);

const rejectedDecisionResult = authorization.authorize({
  proposal,
  diff: fullDiff,
  decision: {
    ...approveAllDecision,
    accepted: false,
  },
});

assert(!rejectedDecisionResult.authorized, 'Expected rejected approval decision to block apply.');
assert(
  rejectedDecisionResult.issues.some((issue) => issue.code === 'APPROVAL_DECISION_NOT_ACCEPTED'),
  'Expected APPROVAL_DECISION_NOT_ACCEPTED issue.',
);

const askRevisionResult = authorization.authorize({
  proposal,
  diff: fullDiff,
  decision: {
    ...approveAllDecision,
    action: 'ask_revision',
  },
});

assert(!askRevisionResult.authorized, 'Expected ask_revision to block apply.');
assert(
  askRevisionResult.issues.some(
    (issue) => issue.code === 'APPROVAL_ACTION_NOT_APPLY_AUTHORIZATION',
  ),
  'Expected APPROVAL_ACTION_NOT_APPLY_AUTHORIZATION issue.',
);

const selectedPatch = new ApprovedPatchBuilder().build({
  proposal,
  selectedFilePaths: ['src/a.ts'],
});

const selectedDiff = new PatchDiffBuilder().build({
  proposal: selectedPatch.proposal,
}).diff;

const approveSelectedDecision: ApprovalDecisionResult = {
  requestId: `approval-patch-${proposal.id}`,
  action: 'approve_selected_files',
  accepted: true,
  selectedFilePaths: ['src/a.ts'],
  decidedAt: '2026-05-25T00:00:00.000Z',
};

const approveSelectedResult = authorization.authorize({
  proposal: selectedPatch.proposal,
  diff: selectedDiff,
  decision: approveSelectedDecision,
});

assert(
  approveSelectedResult.authorized,
  'Expected selected-file decision to authorize filtered proposal/diff.',
);

const unfilteredSelectedResult = authorization.authorize({
  proposal,
  diff: fullDiff,
  decision: approveSelectedDecision,
});

assert(
  !unfilteredSelectedResult.authorized,
  'Expected selected-file approval over unfiltered proposal to be blocked.',
);
assert(
  unfilteredSelectedResult.issues.some(
    (issue) => issue.code === 'SELECTED_APPROVAL_REQUIRES_FILTERED_PROPOSAL',
  ),
  'Expected SELECTED_APPROVAL_REQUIRES_FILTERED_PROPOSAL issue.',
);

const diffNotApprovedResult = authorization.authorize({
  proposal: selectedPatch.proposal,
  diff: fullDiff,
  decision: approveSelectedDecision,
});

assert(!diffNotApprovedResult.authorized, 'Expected diff with unapproved files to be blocked.');
assert(
  diffNotApprovedResult.issues.some((issue) => issue.code === 'DIFF_FILES_NOT_APPROVED'),
  'Expected DIFF_FILES_NOT_APPROVED issue.',
);

const wrongDiffProposalIdResult = authorization.authorize({
  proposal,
  diff: {
    ...fullDiff,
    proposalId: 'wrong-proposal-id',
  },
  decision: approveAllDecision,
});

assert(
  !wrongDiffProposalIdResult.authorized,
  'Expected diff with wrong proposalId to block apply.',
);
assert(
  wrongDiffProposalIdResult.issues.some((issue) => issue.code === 'DIFF_PROPOSAL_ID_MISMATCH'),
  'Expected DIFF_PROPOSAL_ID_MISMATCH issue.',
);

const wrongDiffSessionIdResult = authorization.authorize({
  proposal,
  diff: {
    ...fullDiff,
    sessionId: 'wrong-session-id',
  },
  decision: approveAllDecision,
});

assert(!wrongDiffSessionIdResult.authorized, 'Expected diff with wrong sessionId to block apply.');
assert(
  wrongDiffSessionIdResult.issues.some((issue) => issue.code === 'DIFF_SESSION_ID_MISMATCH'),
  'Expected DIFF_SESSION_ID_MISMATCH issue.',
);

const wrongDiffProjectRootResult = authorization.authorize({
  proposal,
  diff: {
    ...fullDiff,
    projectRoot: '/wrong/project/root',
  },
  decision: approveAllDecision,
});

assert(
  !wrongDiffProjectRootResult.authorized,
  'Expected diff with wrong projectRoot to block apply.',
);
assert(
  wrongDiffProjectRootResult.issues.some((issue) => issue.code === 'DIFF_PROJECT_ROOT_MISMATCH'),
  'Expected DIFF_PROJECT_ROOT_MISMATCH issue.',
);
console.log(
  JSON.stringify(
    {
      message: 'Patch apply authorization test completed',
      approveAllAuthorized: approveAllResult.authorized,
      approveSelectedAuthorized: approveSelectedResult.authorized,
      missingDecisionIssues: missingDecisionResult.issues,
      rejectedDecisionIssues: rejectedDecisionResult.issues,
      askRevisionIssues: askRevisionResult.issues,
      unfilteredSelectedIssues: unfilteredSelectedResult.issues,
      diffNotApprovedIssues: diffNotApprovedResult.issues,
      wrongDiffProposalIdIssues: wrongDiffProposalIdResult.issues,
      wrongDiffSessionIdIssues: wrongDiffSessionIdResult.issues,
      wrongDiffProjectRootIssues: wrongDiffProjectRootResult.issues,
    },
    null,
    2,
  ),
);
