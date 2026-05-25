import { rm } from 'node:fs/promises';
import { ApprovalDecisionStore } from '../approval/ApprovalDecisionStore.js';
import { PatchApplyAuthorization } from '../approval/PatchApplyAuthorization.js';
import type { ApprovalDecisionResult } from '../approval/ApprovalRequest.js';
import { PatchDiffBuilder } from '../diff/PatchDiffBuilder.js';
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

await rm('.runtime/approval-decisions/session-stored-authorization-test', {
  recursive: true,
  force: true,
});

const proposal: RuntimePatchProposal = {
  id: 'proposal-stored-authorization-test',
  planId: 'plan-stored-authorization-test',
  sessionId: 'session-stored-authorization-test',
  projectRoot: '/tmp/zero-runtime-stored-authorization-test',
  summary: 'Validate stored patch apply authorization.',
  files: [
    {
      path: 'src/value.ts',
      operation: 'modify',
      beforeHash: 'hash-value',
      content: 'export const value = 2;\n',
      reason: 'Update value file for stored authorization test.',
      changesSummary: ['Updates value file.'],
      riskLevel: 'low',
      userSelectable: true,
    },
  ],
  risks: [
    {
      code: 'LOW_RISK_PATCH_PROPOSAL',
      level: 'low',
      message: 'Patch proposal is limited to low-impact non-sensitive files.',
      mitigation: 'Still require diff preview and user approval before apply.',
    },
  ],
  verifyCommands: [
    {
      command: 'npm',
      args: ['run', 'typecheck'],
      reason: 'Validate TypeScript after stored authorization test.',
      requiresApproval: true,
    },
  ],
  riskLevel: 'low',
  requiresApproval: true,
  status: 'validated',
  createdAt: '2026-05-25T00:00:00.000Z',
};

const diff = new PatchDiffBuilder().build({
  proposal,
}).diff;

const store = new ApprovalDecisionStore();
const authorization = new PatchApplyAuthorization();

const missingStored = await store.findLatest({
  sessionId: proposal.sessionId,
  proposalId: proposal.id,
  diffId: diff.id,
});

const missingAuthorization = authorization.authorize({
  proposal,
  diff,
  decision: missingStored?.decision ?? null,
});

assert(
  !missingAuthorization.authorized,
  'Expected missing stored decision to block authorization.',
);
assert(
  missingAuthorization.issues.some((issue) => issue.code === 'APPROVAL_DECISION_REQUIRED'),
  'Expected missing stored decision to produce APPROVAL_DECISION_REQUIRED.',
);

const decision: ApprovalDecisionResult = {
  requestId: `approval-patch-${proposal.id}`,
  action: 'approve',
  accepted: true,
  selectedFilePaths: ['src/value.ts'],
  decidedAt: '2026-05-25T00:00:00.000Z',
};

await store.save({
  sessionId: proposal.sessionId,
  projectRoot: proposal.projectRoot,
  proposalId: proposal.id,
  diffId: diff.id,
  decision,
});

const stored = required(
  await store.findLatest({
    sessionId: proposal.sessionId,
    proposalId: proposal.id,
    diffId: diff.id,
  }),
  'Expected stored approval decision.',
);

const storedAuthorization = authorization.authorize({
  proposal,
  diff,
  decision: stored.decision,
});

assert(storedAuthorization.authorized, 'Expected stored approval decision to authorize apply.');
assert(
  storedAuthorization.selectedFilePaths.length === 1 &&
    storedAuthorization.selectedFilePaths[0] === 'src/value.ts',
  'Expected stored authorization to preserve selected file paths.',
);

const wrongDiffLookup = await store.findLatest({
  sessionId: proposal.sessionId,
  proposalId: proposal.id,
  diffId: 'wrong-diff-id',
});

const wrongDiffAuthorization = authorization.authorize({
  proposal,
  diff,
  decision: wrongDiffLookup?.decision ?? null,
});

assert(!wrongDiffAuthorization.authorized, 'Expected wrong diff lookup to block authorization.');
assert(
  wrongDiffAuthorization.issues.some((issue) => issue.code === 'APPROVAL_DECISION_REQUIRED'),
  'Expected wrong diff lookup to produce APPROVAL_DECISION_REQUIRED.',
);

console.log(
  JSON.stringify(
    {
      message: 'Stored patch apply authorization test completed',
      missingAuthorization,
      storedAuthorization,
      wrongDiffAuthorization,
      stored,
    },
    null,
    2,
  ),
);
