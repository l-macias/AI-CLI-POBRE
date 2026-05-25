import { ApprovalCenter } from '../approval/ApprovalCenter.js';
import { ApprovedPatchBuilder } from '../patches/ApprovedPatchBuilder.js';
import { PatchDiffBuilder } from '../diff/PatchDiffBuilder.js';
import type { ApprovalCenterArtifactState } from '../approval/ApprovalRequest.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}
function required<TValue>(value: TValue | null | undefined, message: string): TValue {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}
const proposal: RuntimePatchProposal = {
  id: 'proposal-filtered-diff-approval-test',
  planId: 'plan-filtered-diff-approval-test',
  sessionId: 'session-filtered-diff-approval-test',
  projectRoot: '/tmp/zero-runtime-filtered-diff-approval-test',
  summary: 'Validate approval center accepts filtered diff proposal id.',
  files: [
    {
      path: 'src/a.ts',
      operation: 'modify',
      beforeHash: 'hash-a',
      content: 'export const a = 2;\n',
      reason: 'Update file A for filtered diff approval test.',
      changesSummary: ['Updates file A only.'],
      riskLevel: 'medium',
      userSelectable: true,
    },
    {
      path: 'src/b.ts',
      operation: 'modify',
      beforeHash: 'hash-b',
      content: 'export const b = 2;\n',
      reason: 'Update file B for filtered diff approval test.',
      changesSummary: ['Updates file B but should remain rejected.'],
      riskLevel: 'medium',
      userSelectable: true,
    },
  ],
  risks: [
    {
      code: 'MULTI_FILE_PATCH',
      level: 'medium',
      message: 'Patch proposal affects multiple files.',
      mitigation: 'Require selective approval.',
    },
  ],
  verifyCommands: [
    {
      command: 'npm',
      args: ['run', 'typecheck'],
      reason: 'Validate TypeScript after selected patch.',
      requiresApproval: true,
    },
  ],
  riskLevel: 'medium',
  requiresApproval: true,
  status: 'validated',
  createdAt: '2026-05-25T00:00:00.000Z',
};

const approvedPatch = new ApprovedPatchBuilder().build({
  proposal,
  selectedFilePaths: ['src/a.ts'],
});

const diff = new PatchDiffBuilder().build({
  proposal: approvedPatch.proposal,
}).diff;

assert(
  diff.proposalId.startsWith(`${proposal.id}-selected-`),
  'Expected diff proposal id to target filtered selected proposal.',
);

const artifactState: ApprovalCenterArtifactState = {
  sessionId: proposal.sessionId,
  projectRoot: proposal.projectRoot,
  plan: null,
  proposal,
  diff,
  applyResult: null,
  lastVerifyRun: null,
  snapshotAvailable: true,
  dirtyWorkingTree: false,
};

const center = new ApprovalCenter().build(artifactState);
const patchRequest = required(
  center.requests.find((request) => request.kind === 'patch'),
  'Expected patch approval request.',
);

const approveSelectedAction = required(
  patchRequest.actions.find((action) => action.kind === 'approve_selected_files'),
  'Expected approve_selected_files action.',
);
assert(
  approveSelectedAction.enabled,
  'Expected approve_selected_files to be enabled for filtered diff proposal id.',
);

const approveAction = required(
  patchRequest.actions.find((action) => action.kind === 'approve'),
  'Expected approve action.',
);
assert(approveAction.enabled, 'Expected approve all to remain enabled for filtered diff.');

console.log(
  JSON.stringify(
    {
      message: 'Approval center filtered diff test completed',
      originalProposalId: proposal.id,
      filteredProposalId: approvedPatch.proposal.id,
      diffProposalId: diff.proposalId,
      approveSelectedEnabled: approveSelectedAction.enabled,
      approveEnabled: approveAction.enabled,
    },
    null,
    2,
  ),
);
