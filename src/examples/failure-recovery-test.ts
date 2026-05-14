import { FailureRecovery } from '../failure/FailureRecovery.js';
import { Logger } from '../observability/Logger.js';
import type { ExecutionEngineStepResult } from '../types/ExecutionTypes.js';
import type { RuntimeLoopState } from '../types/RuntimeLoopTypes.js';

async function main(): Promise<void> {
  const logger = new Logger({
    namespace: 'zero-runtime:failure-recovery-test',
    level: 'debug',
  });

  const recovery = new FailureRecovery({
    logger,
  });

  const loopState = createLoopState();
  const blockedStep = createBlockedStepResult();

  console.log('\nTEST 1 — classify blocked protected path and block recovery');
  const first = await recovery.recover({
    loopState,
    stepResult: blockedStep,
    depth: 0,
  });

  console.log(first);

  assertEqual(first.failure.kind, 'protected_path');
  assertEqual(first.action, 'block');

  console.log('\nTEST 2 — repeated same failure triggers loop detection');
  const second = await recovery.recover({
    loopState,
    stepResult: blockedStep,
    depth: 0,
  });

  console.log(second);

  assertEqual(second.failure.kind, 'loop_detected');
  assertEqual(second.action, 'block');

  console.log('\nTEST 3 — recursive depth is blocked');
  const recursive = await recovery.recover({
    loopState,
    stepResult: createGenericBlockedStepResult(),
    depth: 2,
  });

  console.log(recursive);

  assertEqual(recursive.failure.kind, 'recursive_failure');
  assertEqual(recursive.action, 'block');

  console.log('\nSession 21 failure recovery tests completed.');
}

function createLoopState(): RuntimeLoopState {
  const timestamp = new Date().toISOString();

  return {
    id: 'failure-recovery-test-loop',
    status: 'step_executed',
    createdAt: timestamp,
    updatedAt: timestamp,
    objective: {
      objective: 'Test failure recovery.',
      module: 'Failure Recovery',
    },
    issues: [],
  };
}

function createBlockedStepResult(): ExecutionEngineStepResult {
  const timestamp = new Date().toISOString();

  return {
    run: {
      id: 'failure-test-run',
      planId: 'failure-test-plan',
      mode: 'single_step',
      status: 'blocked',
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: timestamp,
      steps: [],
    },
    step: {
      stepId: 'step-protected',
      status: 'blocked',
      attempts: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: timestamp,
      rollbackAvailable: false,
      result: {
        requestId: 'failure-test-request',
        toolName: 'read_file',
        status: 'not_executed',
        issues: [
          {
            code: 'PROTECTED_FILE_BLOCKED',
            message: 'Protected path blocked: .env',
            severity: 'error',
          },
        ],
        executedAt: timestamp,
        durationMs: 0,
      },
    },
    toolResult: {
      requestId: 'failure-test-request',
      toolName: 'read_file',
      status: 'not_executed',
      issues: [
        {
          code: 'PROTECTED_FILE_BLOCKED',
          message: 'Protected path blocked: .env',
          severity: 'error',
        },
      ],
      executedAt: timestamp,
      durationMs: 0,
    },
  };
}

function createGenericBlockedStepResult(): ExecutionEngineStepResult {
  const timestamp = new Date().toISOString();

  return {
    run: {
      id: 'failure-test-run-2',
      planId: 'failure-test-plan-2',
      mode: 'single_step',
      status: 'blocked',
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: timestamp,
      steps: [],
    },
    step: {
      stepId: 'step-generic',
      status: 'blocked',
      attempts: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: timestamp,
      rollbackAvailable: false,
      result: {
        requestId: 'failure-test-request-2',
        toolName: 'execution_engine',
        status: 'not_executed',
        issues: [
          {
            code: 'PLAN_STEP_NOT_FOUND',
            message: 'Step was not found.',
            severity: 'error',
          },
        ],
        executedAt: timestamp,
        durationMs: 0,
      },
    },
    toolResult: {
      requestId: 'failure-test-request-2',
      toolName: 'execution_engine',
      status: 'not_executed',
      issues: [
        {
          code: 'PLAN_STEP_NOT_FOUND',
          message: 'Step was not found.',
          severity: 'error',
        },
      ],
      executedAt: timestamp,
      durationMs: 0,
    },
  };
}

function assertEqual(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Expected "${expected}", received "${actual}".`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
