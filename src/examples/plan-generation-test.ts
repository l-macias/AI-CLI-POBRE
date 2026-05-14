import { AgentRuntime } from '../core/AgentRuntime.js';
import { Logger } from '../observability/Logger.js';
import { ZeroRuntimeError } from '../utils/errors.js';

const logger = new Logger({
  namespace: 'zero-runtime:plan-generation-test',
  level: 'debug',
});

function serializeUnknownError(error: unknown): Record<string, unknown> {
  if (error instanceof ZeroRuntimeError) {
    const serialized: Record<string, unknown> = {
      name: error.name,
      code: error.code,
      message: error.message,
    };

    if (error.cause !== undefined) {
      serialized['cause'] = error.cause;
    }

    return serialized;
  }

  if (error instanceof Error) {
    const serialized: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };

    if (error.stack !== undefined) {
      serialized['stack'] = error.stack;
    }

    return serialized;
  }

  return {
    message: String(error),
  };
}

async function main(): Promise<void> {
  const runtime = new AgentRuntime({
    logger,
  });

  await runtime.initialize();

  await runtime.acceptObjective({
    objective:
      'Implement Session 12: formalize plan review lifecycle so valid plans require explicit approval before becoming ready for execution.',
    module: 'Planning',
  });

  logger.info('Generating runtime plan');

  const plan = await runtime.generatePlan();

  logger.info('Plan generated and validated', {
    plan,
    state: runtime.getStateSnapshot(),
  });

  logger.info('Approving active runtime plan');

  const approvedReview = await runtime.approveActivePlan();

  logger.info('Plan approved', {
    review: approvedReview,
    state: runtime.getStateSnapshot(),
  });

  logger.info('Marking active runtime plan ready for execution');

  const readyReview = await runtime.markActivePlanReadyForExecution();

  logger.info('Plan marked ready for execution', {
    review: readyReview,
    state: runtime.getStateSnapshot(),
  });

  logger.info('Plan review state machine test completed', {
    finalStatus: readyReview.status,
    planId: readyReview.plan.id,
  });
}

main().catch((error: unknown) => {
  logger.error('Plan generation test failed', {
    error: serializeUnknownError(error),
  });

  process.exitCode = 1;
});
