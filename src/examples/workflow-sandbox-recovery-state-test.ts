import { RuntimeWorkflowStateMachine } from '../workflow/RuntimeWorkflowStateMachine.js';
import type {
  RuntimeWorkflowArtifactState,
  RuntimeWorkflowStepId,
} from '../workflow/RuntimeWorkflowState.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function baseState(
  overrides: Partial<RuntimeWorkflowArtifactState> = {},
): RuntimeWorkflowArtifactState {
  return {
    sessionStarted: true,
    workflowPrepared: true,
    pendingQuestionCount: 0,
    pendingHighPriorityQuestionCount: 0,
    planValid: true,
    planRejected: false,
    planMode: 'patch',
    patchProposalValid: true,
    patchProposalRejected: false,
    diffReady: true,
    diffBlocked: false,

    sandboxPassed: false,
    sandboxFailed: false,
    sandboxBlocked: false,

    recoveryAvailable: false,
    recoveryPrepared: false,
    recoveryMaxAttemptsReached: false,
    repairedProposalGenerated: false,

    snapshotAvailable: true,
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
    riskLevel: 'high',
    ...overrides,
  };
}

function getStepStatus(input: {
  state: ReturnType<RuntimeWorkflowStateMachine['build']>;
  stepId: RuntimeWorkflowStepId;
}): string {
  const step = input.state.steps.find((candidate) => candidate.id === input.stepId);

  if (!step) {
    throw new Error(`Missing workflow step: ${input.stepId}`);
  }

  return step.status;
}

const machine = new RuntimeWorkflowStateMachine();

const readyForSandbox = machine.build(baseState());

assert(readyForSandbox.currentStepId === 'sandbox', 'Expected sandbox step after diff/snapshot.');
assert(
  getStepStatus({ state: readyForSandbox, stepId: 'sandbox' }) === 'available',
  'Sandbox should be available before verification.',
);
assert(
  getStepStatus({ state: readyForSandbox, stepId: 'apply' }) === 'locked',
  'Apply must be locked before sandbox passed.',
);

const sandboxFailed = machine.build(
  baseState({
    sandboxFailed: true,
    recoveryAvailable: true,
  }),
);

assert(
  sandboxFailed.currentStepId === 'recovery_prepare',
  'Sandbox failure should move workflow to recovery preparation.',
);
assert(
  getStepStatus({ state: sandboxFailed, stepId: 'sandbox' }) === 'blocked',
  'Sandbox step should remain blocked after failure.',
);
assert(
  getStepStatus({ state: sandboxFailed, stepId: 'recovery_prepare' }) === 'available',
  'Recovery prepare should become available after sandbox failure.',
);
assert(
  getStepStatus({ state: sandboxFailed, stepId: 'apply' }) === 'locked',
  'Apply must remain locked after sandbox failure.',
);
assert(!sandboxFailed.canContinue, 'Failed sandbox should block required workflow.');

const repairedPatch = machine.build(
  baseState({
    diffReady: false,
    sandboxFailed: false,
    sandboxBlocked: false,
    recoveryAvailable: true,
    recoveryPrepared: true,
    repairedProposalGenerated: true,
  }),
);

assert(
  repairedPatch.currentStepId === 'diff_preview',
  'Repaired patch should send workflow back to diff preview.',
);
assert(
  getStepStatus({ state: repairedPatch, stepId: 'repaired_patch' }) === 'completed',
  'Repaired patch step should be completed.',
);
assert(
  getStepStatus({ state: repairedPatch, stepId: 'sandbox' }) === 'locked',
  'Sandbox should wait for new repaired diff.',
);

const repairedDiffReady = machine.build(
  baseState({
    recoveryAvailable: true,
    recoveryPrepared: true,
    repairedProposalGenerated: true,
  }),
);

assert(
  repairedDiffReady.currentStepId === 'sandbox',
  'After repaired diff, workflow should require sandbox again.',
);
assert(
  getStepStatus({ state: repairedDiffReady, stepId: 'sandbox' }) === 'available',
  'Sandbox should be available for repaired diff.',
);

const sandboxPassed = machine.build(
  baseState({
    sandboxPassed: true,
  }),
);

assert(sandboxPassed.currentStepId === 'dry_run', 'Passed sandbox should unlock dry-run.');
assert(
  getStepStatus({ state: sandboxPassed, stepId: 'sandbox' }) === 'completed',
  'Sandbox should be completed after pass.',
);
assert(
  getStepStatus({ state: sandboxPassed, stepId: 'apply' }) === 'available',
  'Apply should be available after sandbox passed when snapshot gates are satisfied.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'workflow-sandbox-recovery-state-test',
      readyForSandboxCurrentStep: readyForSandbox.currentStepId,
      sandboxFailedCurrentStep: sandboxFailed.currentStepId,
      repairedPatchCurrentStep: repairedPatch.currentStepId,
      sandboxPassedCurrentStep: sandboxPassed.currentStepId,
    },
    null,
    2,
  ),
);
