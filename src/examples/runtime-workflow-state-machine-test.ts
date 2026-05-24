import { RuntimeActionAvailabilityResolver } from '../workflow/RuntimeActionAvailability.js';
import { RuntimeWorkflowStateMachine } from '../workflow/RuntimeWorkflowStateMachine.js';
import type { RuntimeWorkflowArtifactState } from '../workflow/RuntimeWorkflowState.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function baseState(
  overrides: Partial<RuntimeWorkflowArtifactState> = {},
): RuntimeWorkflowArtifactState {
  return {
    sessionStarted: false,
    workflowPrepared: false,
    planValid: false,
    planRejected: false,
    patchProposalValid: false,
    patchProposalRejected: false,
    diffReady: false,
    diffBlocked: false,
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
    riskLevel: null,
    ...overrides,
  };
}

const machine = new RuntimeWorkflowStateMachine();
const actions = new RuntimeActionAvailabilityResolver();

const empty = machine.build(baseState());

assert(empty.currentStepId === 'session', 'Expected session as first step.');
assert(empty.percentage === 0, 'Expected empty workflow percentage 0.');

const prepared = machine.build(
  baseState({
    sessionStarted: true,
    workflowPrepared: true,
  }),
);

assert(prepared.currentStepId === 'runtime_plan', 'Expected runtime plan next.');
assert(actions.resolve(prepared).actionId === 'generate_runtime_plan', 'Expected plan action.');

const planRejected = machine.build(
  baseState({
    sessionStarted: true,
    workflowPrepared: true,
    planRejected: true,
  }),
);

assert(planRejected.currentStepId === 'runtime_plan', 'Expected blocked plan current step.');
assert(!planRejected.canContinue, 'Rejected required plan should block continuation.');
assert(actions.resolve(planRejected).enabled === false, 'Blocked plan should disable next action.');

const highRiskNeedsSnapshot = machine.build(
  baseState({
    sessionStarted: true,
    workflowPrepared: true,
    planValid: true,
    patchProposalValid: true,
    diffReady: true,
    riskLevel: 'high',
  }),
);

assert(highRiskNeedsSnapshot.snapshotRequired, 'Expected high risk snapshot requirement.');
assert(highRiskNeedsSnapshot.currentStepId === 'snapshot', 'Expected snapshot next for high risk.');
assert(
  actions.resolve(highRiskNeedsSnapshot).actionId === 'create_snapshot',
  'Expected create snapshot action.',
);

const readyForDryRun = machine.build(
  baseState({
    sessionStarted: true,
    workflowPrepared: true,
    planValid: true,
    patchProposalValid: true,
    diffReady: true,
    snapshotAvailable: true,
    riskLevel: 'high',
  }),
);

assert(readyForDryRun.currentStepId === 'dry_run', 'Expected dry-run after snapshot.');

const readyForApply = machine.build(
  baseState({
    sessionStarted: true,
    workflowPrepared: true,
    planValid: true,
    patchProposalValid: true,
    diffReady: true,
    snapshotAvailable: true,
    dryRunCompleted: true,
    riskLevel: 'high',
  }),
);

assert(readyForApply.currentStepId === 'apply', 'Expected apply after dry-run.');
assert(
  actions.resolve(readyForApply).actionId === 'apply_patch',
  'Expected apply patch action availability.',
);
assert(
  !actions.resolve(readyForApply).enabled,
  'Apply action should require explicit UI confirmation.',
);

const applied = machine.build(
  baseState({
    sessionStarted: true,
    workflowPrepared: true,
    planValid: true,
    patchProposalValid: true,
    diffReady: true,
    snapshotAvailable: true,
    dryRunCompleted: true,
    applyApplied: true,
    riskLevel: 'medium',
  }),
);

assert(applied.currentStepId === 'rollback', 'Expected rollback availability after apply.');

const completed = machine.build(
  baseState({
    sessionStarted: true,
    workflowPrepared: true,
    planValid: true,
    patchProposalValid: true,
    diffReady: true,
    snapshotAvailable: true,
    dryRunCompleted: true,
    applyApplied: true,
    rollbackCompleted: true,
    verifyCompleted: true,
    reportExported: true,
    riskLevel: 'low',
  }),
);

assert(completed.percentage === 100, 'Expected completed workflow percentage 100.');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-workflow-state-machine-test',
      emptyCurrentStep: empty.currentStepId,
      preparedAction: actions.resolve(prepared).actionId,
      highRiskSnapshotRequired: highRiskNeedsSnapshot.snapshotRequired,
      readyForApplyAction: actions.resolve(readyForApply).actionId,
      completedPercentage: completed.percentage,
    },
    null,
    2,
  ),
);
