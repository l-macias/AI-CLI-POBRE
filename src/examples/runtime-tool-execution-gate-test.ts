import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { AgentRuntime } from '../core/AgentRuntime.js';
import type { RuntimePlan, RuntimePlanReview } from '../types/PlanningTypes.js';

const testDirectory = '.runtime/session-18-tests';
const testTarget = `${testDirectory}/runtime-created-file.txt`;

async function main(): Promise<void> {
  await resetTestDirectory();

  const runtime = new AgentRuntime();

  await runtime.initialize();

  const basePlan = createPlan();

  console.log('\nTEST 1 — validated plan cannot execute');
  setActivePlanReviewForTest(runtime, {
    plan: basePlan,
    status: 'validated',
  });

  const validatedResult = await runtime.executeActivePlanStep('step-create-file');

  console.log(validatedResult);

  assertStatus(validatedResult.status, 'not_executed');

  console.log('\nTEST 2 — approved plan cannot execute');
  setActivePlanReviewForTest(runtime, {
    plan: basePlan,
    status: 'approved',
  });

  const approvedResult = await runtime.executeActivePlanStep('step-create-file');

  console.log(approvedResult);

  assertStatus(approvedResult.status, 'not_executed');

  console.log('\nTEST 3 — ready_for_execution can execute create_file');
  setActivePlanReviewForTest(runtime, {
    plan: basePlan,
    status: 'ready_for_execution',
  });

  const readyResult = await runtime.executeActivePlanStep('step-create-file');

  console.log(readyResult);

  assertStatus(readyResult.status, 'executed');

  console.log('\nTEST 4 — missing step is blocked');
  const missingStepResult = await runtime.executeActivePlanStep('missing-step');

  console.log(missingStepResult);

  assertStatus(missingStepResult.status, 'not_executed');

  console.log('\nTEST 5 — run_command step is blocked');
  const commandPlan = createRunCommandPlan();

  setActivePlanReviewForTest(runtime, {
    plan: commandPlan,
    status: 'ready_for_execution',
  });

  const commandResult = await runtime.executeActivePlanStep('step-run-command');

  console.log(commandResult);

  assertStatus(commandResult.status, 'not_executed');

  console.log('\nTEST 6 — protected file is blocked by guardrails');
  const protectedPlan = createProtectedFilePlan();

  setActivePlanReviewForTest(runtime, {
    plan: protectedPlan,
    status: 'ready_for_execution',
  });

  const protectedResult = await runtime.executeActivePlanStep('step-read-env');

  console.log(protectedResult);

  assertStatus(protectedResult.status, 'not_executed');

  console.log('\nSession 18 runtime tool execution gate tests completed.');
}

function createPlan(): RuntimePlan {
  const createdAt = new Date().toISOString();

  return {
    id: 'session-18-test-plan',
    objectiveId: 'session-18-objective',
    title: 'Session 18 Test Plan',
    summary: 'Validate runtime tool execution gate.',
    riskLevel: 'low',
    createdAt,
    steps: [
      {
        id: 'step-create-file',
        type: 'create_file',
        title: 'Create controlled test file',
        description: 'Create a file through runtime-controlled tool execution.',
        target: testTarget,
        expectedOutcome: 'A file is created under .runtime/session-18-tests.',
        requiresApproval: true,
        toolIntent: {
          toolName: 'create_file',
          input: {
            target: testTarget,
            content: 'Session 18 runtime-controlled create_file test.\n',
            overwrite: false,
          },
        },
      },
    ],
  };
}

function createRunCommandPlan(): RuntimePlan {
  const createdAt = new Date().toISOString();

  return {
    id: 'session-18-command-plan',
    objectiveId: 'session-18-objective',
    title: 'Session 18 Command Block Test Plan',
    summary: 'Validate run_command is blocked.',
    riskLevel: 'high',
    createdAt,
    steps: [
      {
        id: 'step-run-command',
        type: 'run_command',
        title: 'Blocked command',
        description: 'This must not execute in Session 18.',
        command: 'echo blocked',
        expectedOutcome: 'Command is blocked.',
        requiresApproval: true,
        toolIntent: {
          toolName: 'run_command',
          input: {
            command: 'echo blocked',
          },
        },
      },
    ],
  };
}

function createProtectedFilePlan(): RuntimePlan {
  const createdAt = new Date().toISOString();

  return {
    id: 'session-18-protected-plan',
    objectiveId: 'session-18-objective',
    title: 'Session 18 Protected File Test Plan',
    summary: 'Validate protected files are blocked.',
    riskLevel: 'medium',
    createdAt,
    steps: [
      {
        id: 'step-read-env',
        type: 'inspect',
        title: 'Try reading protected env',
        description: 'This must be blocked by protected file guardrails.',
        target: '.env',
        expectedOutcome: '.env is not read.',
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
