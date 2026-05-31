import { ApprovalCenter } from '../approval/ApprovalCenter.js';
import { RuntimeActionAvailabilityResolver } from '../workflow/RuntimeActionAvailability.js';
import { RuntimeWorkflowStateMachine } from '../workflow/RuntimeWorkflowStateMachine.js';
import type { RuntimePlan } from '../planning/RuntimePlan.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const readOnlyPlan: RuntimePlan = {
  id: 'runtime-plan-read-only-workflow-state-test',
  sessionId: 'session-read-only-workflow-state-test',
  projectRoot: '.',
  projectName: 'read-only-workflow-fixture',
  objective: 'Analyze project and produce recommendations only.',
  mode: 'read_only',
  scope: {
    summary: 'Read-only plan.',
    includedAreas: ['frontend'],
    excludedAreas: ['patch proposal generation', 'file apply operations'],
    candidateFiles: [
      {
        path: 'src/app/page.tsx',
        reason: 'Relevant source file.',
        existsKnown: true,
      },
    ],
  },
  steps: [
    {
      id: 'step-001',
      kind: 'inspect',
      title: 'Inspect',
      description: 'Inspect source.',
      requiresApproval: false,
    },
    {
      id: 'step-002',
      kind: 'context',
      title: 'Context',
      description: 'Analyze context.',
      requiresApproval: false,
    },
    {
      id: 'step-003',
      kind: 'report',
      title: 'Report',
      description: 'Export report.',
      requiresApproval: false,
    },
  ],
  risks: [
    {
      code: 'READ_ONLY_ANALYSIS',
      level: 'low',
      message: 'Read-only analysis.',
      mitigation: 'No writes.',
    },
  ],
  verifyCommands: [],
  needsSnapshot: false,
  requiresApproval: false,
  riskLevel: 'low',
  status: 'validated',
  createdAt: new Date().toISOString(),
};

const stateMachine = new RuntimeWorkflowStateMachine();
const workflow = stateMachine.build({
  sessionStarted: true,
  workflowPrepared: true,
  pendingQuestionCount: 0,
  pendingHighPriorityQuestionCount: 0,
  planValid: true,
  planRejected: false,
  planMode: 'read_only',
  patchProposalValid: false,
  patchProposalRejected: false,
  diffReady: false,
  diffBlocked: false,
  sandboxPassed: false,
  sandboxFailed: false,
  sandboxBlocked: false,
  recoveryAvailable: false,
  recoveryPrepared: false,
  recoveryMaxAttemptsReached: false,
  repairedProposalGenerated: false,
  snapshotAvailable: false,
  dryRunCompleted: false,
  applyApplied: false,
  applyBlocked: false,
  applyFailed: false,
  rollbackDryRunCompleted: false,
  rollbackCompleted: false,
  rollbackBlocked: false,
  rollbackFailed: false,
  verifyCompleted: false,
  reportExported: false,
  riskLevel: 'low',
});

const workflowStepIds = workflow.steps.map((step) => step.id);

assert(workflowStepIds.includes('runtime_plan'), 'Expected read-only workflow to include plan.');
assert(workflowStepIds.includes('report'), 'Expected read-only workflow to include report.');
assert(!workflowStepIds.includes('patch_proposal'), 'Read-only workflow must not include patch.');
assert(!workflowStepIds.includes('diff_preview'), 'Read-only workflow must not include diff.');
assert(!workflowStepIds.includes('snapshot'), 'Read-only workflow must not include snapshot.');
assert(!workflowStepIds.includes('sandbox'), 'Read-only workflow must not include sandbox.');
assert(!workflowStepIds.includes('apply'), 'Read-only workflow must not include apply.');
assert(workflow.snapshotRequired === false, 'Read-only workflow must not require snapshot.');

const nextAction = new RuntimeActionAvailabilityResolver().resolve(workflow);

assert(
  nextAction.actionId === 'export_report',
  `Expected next read-only action to be export_report. Got: ${nextAction.actionId}`,
);

const approvalCenter = new ApprovalCenter().build({
  sessionId: 'session-read-only-workflow-state-test',
  projectRoot: '.',
  plan: readOnlyPlan,
  planMode: 'read_only',
  proposal: null,
  diff: null,
  applyResult: null,
  lastVerifyRun: null,
  snapshotAvailable: false,
  dirtyWorkingTree: false,
});

assert(
  approvalCenter.requests.length === 0,
  `Read-only approval center should have no patch/plan approvals. Found: ${approvalCenter.requests.length}`,
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'read-only-workflow-state-test',
      checked: {
        workflowStepIds,
        nextAction: nextAction.actionId,
        approvalRequests: approvalCenter.requests.length,
      },
    },
    null,
    2,
  ),
);
