import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { AgentRuntime } from '../core/AgentRuntime.js';
import type { RuntimePlan, RuntimePlanReview } from '../types/PlanningTypes.js';

const testDirectory = '.runtime/session-19-tests';
const firstTarget = `${testDirectory}/first.txt`;
const secondTarget = `${testDirectory}/second.txt`;

async function main(): Promise<void> {
  await resetTestDirectory();

  const runtime = new AgentRuntime();

  await runtime.initialize();

  setActivePlanReviewForTest(runtime, {
    plan: createPlan(),
    status: 'ready_for_execution',
  });

  console.log('\nTEST 1 — execute one explicit step through ExecutionEngine');
  const first = await runtime.executeActivePlanStepThroughEngine('step-create-first');
  console.log(first);
  assertStatus(first.step.status, 'executed');

  console.log('\nTEST 2 — repeated executed step is blocked');
  const repeated = await runtime.executeActivePlanStepThroughEngine('step-create-first');
  console.log(repeated);
  assertStatus(repeated.step.status, 'blocked');

  console.log('\nTEST 3 — execute next pending step');
  const next = await runtime.executeNextActivePlanStep();
  console.log(next);
  assertStatus(next.step.status, 'executed');

  console.log('\nTEST 4 — no pending steps is blocked');
  const noPending = await runtime.executeNextActivePlanStep();
  console.log(noPending);
  assertStatus(noPending.step.status, 'blocked');

  console.log('\nSession 19 execution engine tests completed.');
}

function createPlan(): RuntimePlan {
  const createdAt = new Date().toISOString();

  return {
    id: 'session-19-test-plan',
    objectiveId: 'session-19-objective',
    title: 'Session 19 Test Plan',
    summary: 'Validate controlled execution engine.',
    riskLevel: 'low',
    createdAt,
    steps: [
      {
        id: 'step-create-first',
        type: 'create_file',
        title: 'Create first file',
        description: 'Create first test file.',
        target: firstTarget,
        expectedOutcome: 'First file created.',
        requiresApproval: true,
        toolIntent: {
          toolName: 'create_file',
          input: {
            target: firstTarget,
            content: 'First file created by ExecutionEngine.\n',
            overwrite: false,
          },
        },
      },
      {
        id: 'step-create-second',
        type: 'create_file',
        title: 'Create second file',
        description: 'Create second test file.',
        target: secondTarget,
        expectedOutcome: 'Second file created.',
        requiresApproval: true,
        toolIntent: {
          toolName: 'create_file',
          input: {
            target: secondTarget,
            content: 'Second file created by ExecutionEngine.\n',
            overwrite: false,
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

async function resetTestDirectory(): Promise<void> {
  const absolutePath = path.resolve(process.cwd(), testDirectory);

  await rm(absolutePath, {
    recursive: true,
    force: true,
  });

  await mkdir(absolutePath, {
    recursive: true,
  });
}

function assertStatus(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Expected status "${expected}", received "${actual}".`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
