import { RuntimeActionAvailabilityResolver } from '../workflow/RuntimeActionAvailability.js';
import { RuntimeWorkflowStateMachine } from '../workflow/RuntimeWorkflowStateMachine.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const workflow = new RuntimeWorkflowStateMachine().build({
  sessionStarted: true,
  workflowPrepared: true,
  pendingQuestionCount: 2,
  pendingHighPriorityQuestionCount: 1,
  planValid: false,
  planRejected: false,
  planMode: null,
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
});

const questionStep = workflow.steps.find((step) => step.id === 'runtime_questions');
const planStep = workflow.steps.find((step) => step.id === 'runtime_plan');
const nextAction = new RuntimeActionAvailabilityResolver().resolve(workflow);

if (!questionStep) {
  throw new Error('Expected runtime_questions step to exist.');
}

if (!planStep) {
  throw new Error('Expected runtime_plan step to exist.');
}

assert(questionStep.status === 'available', 'Expected runtime_questions to be available.');
assert(planStep.status === 'locked', 'Expected runtime_plan to be locked behind questions.');
assert(
  nextAction.actionId === 'answer_runtime_questions',
  `Expected next action to be answer_runtime_questions. Got: ${nextAction.actionId}`,
);

const resolvedWorkflow = new RuntimeWorkflowStateMachine().build({
  sessionStarted: true,
  workflowPrepared: true,
  pendingQuestionCount: 0,
  pendingHighPriorityQuestionCount: 0,
  planValid: false,
  planRejected: false,
  planMode: null,
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
});

const resolvedNextAction = new RuntimeActionAvailabilityResolver().resolve(resolvedWorkflow);

assert(
  resolvedNextAction.actionId === 'generate_runtime_plan',
  `Expected resolved next action to be generate_runtime_plan. Got: ${resolvedNextAction.actionId}`,
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'questions-before-plan-workflow-test',
      checked: {
        gatedNextAction: nextAction.actionId,
        resolvedNextAction: resolvedNextAction.actionId,
      },
    },
    null,
    2,
  ),
);
