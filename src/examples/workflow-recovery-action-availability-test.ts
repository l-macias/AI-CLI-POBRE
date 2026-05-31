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

const machine = new RuntimeWorkflowStateMachine();
const resolver = new RuntimeActionAvailabilityResolver();

const readyForSandbox = machine.build(baseState());

const sandboxAction = resolver.resolve(readyForSandbox);

assert(readyForSandbox.currentStepId === 'sandbox', 'Expected sandbox as next step.');
assert(sandboxAction.actionId === 'verify_sandbox', 'Expected verify_sandbox action.');
assert(sandboxAction.enabled, 'Sandbox action should be enabled.');

const failedSandbox = machine.build(
  baseState({
    sandboxFailed: true,
    recoveryAvailable: true,
  }),
);

const failedSandboxAction = resolver.resolve(failedSandbox);

assert(
  failedSandbox.currentStepId === 'recovery_prepare',
  'Failed sandbox should move current step to recovery preparation.',
);
assert(
  failedSandboxAction.actionId === 'prepare_recovery',
  'Failed sandbox should expose prepare recovery action.',
);
assert(failedSandboxAction.enabled, 'Prepare recovery action should be enabled.');
assert(
  !failedSandbox.canContinue,
  'Failed sandbox should still mark required workflow as blocked.',
);
const recoveryAvailable = machine.build(
  baseState({
    diffReady: false,
    sandboxFailed: false,
    sandboxBlocked: false,
    recoveryAvailable: true,
  }),
);

const recoveryAction = resolver.resolve(recoveryAvailable);

assert(
  recoveryAvailable.currentStepId === 'diff_preview',
  'Without diffReady, workflow should request diff preview before recovery path.',
);
assert(
  recoveryAction.actionId === 'generate_diff_preview',
  'Expected diff preview action before recovery can continue.',
);

const recoveryPrepared = machine.build(
  baseState({
    diffReady: false,
    recoveryAvailable: true,
    recoveryPrepared: true,
  }),
);

const repairedPatchAction = resolver.resolve(recoveryPrepared);

assert(
  recoveryPrepared.currentStepId === 'diff_preview',
  'Prepared recovery without repaired proposal should still need repaired proposal/diff progression.',
);
assert(
  repairedPatchAction.actionId === 'generate_diff_preview',
  'Current state still requires diff preview because proposal/diff state has been reset.',
);

const repairedPatchGenerated = machine.build(
  baseState({
    diffReady: false,
    recoveryAvailable: true,
    recoveryPrepared: true,
    repairedProposalGenerated: true,
  }),
);

const repairedPatchGeneratedAction = resolver.resolve(repairedPatchGenerated);

assert(
  repairedPatchGenerated.currentStepId === 'diff_preview',
  'Repaired proposal should move workflow back to diff preview.',
);
assert(
  repairedPatchGeneratedAction.actionId === 'generate_diff_preview',
  'Expected generate_diff_preview after repaired proposal.',
);
assert(
  repairedPatchGeneratedAction.enabled,
  'Diff action should be enabled for repaired proposal.',
);

const maxAttemptsReached = machine.build(
  baseState({
    sandboxFailed: true,
    recoveryAvailable: true,
    recoveryPrepared: true,
    recoveryMaxAttemptsReached: true,
  }),
);

const maxAttemptsAction = resolver.resolve(maxAttemptsReached);

assert(!maxAttemptsReached.canContinue, 'Max attempts should block workflow.');
assert(maxAttemptsAction.actionId === 'none', 'Max attempts should expose no available action.');
assert(!maxAttemptsAction.enabled, 'Max attempts action should be disabled.');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'workflow-recovery-action-availability-test',
      readyForSandboxAction: sandboxAction.actionId,
      failedSandboxAction: failedSandboxAction.actionId,
      repairedPatchGeneratedAction: repairedPatchGeneratedAction.actionId,
      maxAttemptsAction: maxAttemptsAction.actionId,
    },
    null,
    2,
  ),
);
