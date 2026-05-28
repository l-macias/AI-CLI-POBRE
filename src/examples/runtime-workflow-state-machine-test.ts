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

const readyForSandbox = machine.build(
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

assert(readyForSandbox.currentStepId === 'sandbox', 'Expected sandbox after snapshot.');
assert(
  actions.resolve(readyForSandbox).actionId === 'verify_sandbox',
  'Expected sandbox verification action.',
);

const sandboxFailed = machine.build(
  baseState({
    sessionStarted: true,
    workflowPrepared: true,
    planValid: true,
    patchProposalValid: true,
    diffReady: true,
    snapshotAvailable: true,
    sandboxFailed: true,
    recoveryAvailable: true,
    riskLevel: 'high',
  }),
);

assert(
  sandboxFailed.currentStepId === 'recovery_prepare',
  'Failed sandbox should move current step to recovery preparation.',
);
assert(
  !sandboxFailed.canContinue,
  'Failed sandbox should block continuation until recovery flow runs.',
);
assert(
  actions.resolve(sandboxFailed).actionId === 'prepare_recovery',
  'Expected prepare recovery action after failed sandbox.',
);
assert(
  sandboxFailed.blockedReasons.includes(
    'Sandbox verification failed. Recovery is required before apply.',
  ),
  'Expected sandbox failure blocked reason.',
);

const recoveryPrepared = machine.build(
  baseState({
    sessionStarted: true,
    workflowPrepared: true,
    planValid: true,
    patchProposalValid: true,
    diffReady: true,
    snapshotAvailable: true,
    sandboxFailed: true,
    recoveryAvailable: true,
    recoveryPrepared: true,
    riskLevel: 'high',
  }),
);

assert(
  recoveryPrepared.currentStepId === 'repaired_patch',
  'Prepared recovery should move current step to repaired patch generation.',
);
assert(
  actions.resolve(recoveryPrepared).actionId === 'generate_repaired_patch',
  'Expected generate repaired patch action after recovery preparation.',
);
const repairedPatchReadyForDiff = machine.build(
  baseState({
    sessionStarted: true,
    workflowPrepared: true,
    planValid: true,
    patchProposalValid: true,
    repairedProposalGenerated: true,
    recoveryAvailable: true,
    recoveryPrepared: true,
    riskLevel: 'high',
  }),
);

assert(
  repairedPatchReadyForDiff.currentStepId === 'diff_preview',
  'Repaired patch should return workflow to diff preview.',
);
assert(
  actions.resolve(repairedPatchReadyForDiff).actionId === 'generate_diff_preview',
  'Expected diff preview action after repaired patch.',
);

const maxAttemptsReached = machine.build(
  baseState({
    sessionStarted: true,
    workflowPrepared: true,
    planValid: true,
    patchProposalValid: true,
    diffReady: true,
    snapshotAvailable: true,
    sandboxFailed: true,
    recoveryAvailable: true,
    recoveryPrepared: true,
    recoveryMaxAttemptsReached: true,
    riskLevel: 'high',
  }),
);

assert(!maxAttemptsReached.canContinue, 'Max recovery attempts should block continuation.');
assert(
  maxAttemptsReached.blockedReasons.includes('Maximum recovery attempts reached.'),
  'Expected max attempts blocked reason.',
);

const sandboxPassed = machine.build(
  baseState({
    sessionStarted: true,
    workflowPrepared: true,
    planValid: true,
    patchProposalValid: true,
    diffReady: true,
    snapshotAvailable: true,
    sandboxPassed: true,
    riskLevel: 'high',
  }),
);

assert(sandboxPassed.currentStepId === 'dry_run', 'Expected dry-run after passed sandbox.');

const readyForApply = machine.build(
  baseState({
    sessionStarted: true,
    workflowPrepared: true,
    planValid: true,
    patchProposalValid: true,
    diffReady: true,
    snapshotAvailable: true,
    sandboxPassed: true,
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
    sandboxPassed: true,
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
    sandboxPassed: true,
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
      readyForSandboxAction: actions.resolve(readyForSandbox).actionId,
      repairedPatchCurrentStep: repairedPatchReadyForDiff.currentStepId,
      readyForApplyAction: actions.resolve(readyForApply).actionId,
      completedPercentage: completed.percentage,
    },
    null,
    2,
  ),
);
