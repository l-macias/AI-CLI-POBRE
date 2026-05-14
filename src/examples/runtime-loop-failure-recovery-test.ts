import { AgentRuntime } from '../core/AgentRuntime.js';
import type { RuntimePlan, RuntimePlanReview } from '../types/PlanningTypes.js';

async function main(): Promise<void> {
  const runtime = new AgentRuntime();

  await runtime.initialize();

  setActivePlanReviewForTest(runtime, {
    plan: createBlockedPlan(),
    status: 'ready_for_execution',
  });

  const result = await runtime.executeActivePlanStepThroughEngine('step-read-env');

  console.log(result);

  if (result.step.status !== 'blocked') {
    throw new Error(`Expected blocked step, received "${result.step.status}".`);
  }

  console.log('\nRuntime loop failure recovery integration base test completed.');
}

function createBlockedPlan(): RuntimePlan {
  const createdAt = new Date().toISOString();

  return {
    id: 'runtime-loop-failure-plan',
    objectiveId: 'runtime-loop-failure-objective',
    title: 'Blocked protected file test',
    summary: 'Validate blocked execution result for recovery pipeline.',
    riskLevel: 'medium',
    createdAt,
    steps: [
      {
        id: 'step-read-env',
        type: 'inspect',
        title: 'Read protected env',
        description: 'Attempt to read .env and confirm guardrails block it.',
        target: '.env',
        expectedOutcome: 'The runtime blocks protected file access.',
        requiresApproval: true,
        toolIntent: {
          toolName: 'read_file',
          input: {
            target: '.env',
          },
        },
      },
    ],
  };
}

function setActivePlanReviewForTest(
  runtime: AgentRuntime,
  input: {
    plan: RuntimePlan;
    status: RuntimePlanReview['status'];
  },
): void {
  const timestamp = new Date().toISOString();

  const review: RuntimePlanReview = {
    plan: input.plan,
    status: input.status,
    validation: {
      valid: true,
      issues: [],
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const stateCarrier = runtime as unknown as {
    state: {
      setPhase(phase: 'planning'): void;
      setActivePlanReview(review: RuntimePlanReview): void;
    };
  };

  stateCarrier.state.setPhase('planning');
  stateCarrier.state.setActivePlanReview(review);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
