import { rm } from 'node:fs/promises';
import { ApprovalDecisionStore } from '../approval/ApprovalDecisionStore.js';
import type { ApprovalDecisionResult } from '../approval/ApprovalRequest.js';

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
await rm('.runtime/approval-decisions/session-approval-store-test', {
  recursive: true,
  force: true,
});

const store = new ApprovalDecisionStore();

const decision: ApprovalDecisionResult = {
  requestId: 'approval-patch-proposal-a',
  action: 'approve_selected_files',
  accepted: true,
  selectedFilePaths: ['src/a.ts'],
  decidedAt: '2026-05-25T00:00:00.000Z',
};

const saved = await store.save({
  sessionId: 'session-approval-store-test',
  projectRoot: '/tmp/project',
  proposalId: 'proposal-a-selected-abc',
  diffId: 'diff-a',
  decision,
});

assert(saved.decision.selectedFilePaths.length === 1, 'Expected saved decision selected files.');

const found = required(
  await store.findLatest({
    sessionId: 'session-approval-store-test',
    proposalId: 'proposal-a-selected-abc',
    diffId: 'diff-a',
  }),
  'Expected stored approval decision to be found.',
);

assert(found.decision.action === 'approve_selected_files', 'Expected selected-files action.');
assert(found.decision.selectedFilePaths[0] === 'src/a.ts', 'Expected stored selected file.');

const missing = await store.findLatest({
  sessionId: 'session-approval-store-test',
  proposalId: 'proposal-missing',
  diffId: 'diff-a',
});

assert(missing === null, 'Expected missing approval decision to return null.');

console.log(
  JSON.stringify(
    {
      message: 'Approval decision store test completed',
      saved,
      found,
      missing,
    },
    null,
    2,
  ),
);
