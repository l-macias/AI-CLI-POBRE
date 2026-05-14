import { AgentRuntime } from '../core/AgentRuntime.js';
import { Logger } from '../observability/Logger.js';

const logger = new Logger({
  namespace: 'zero-runtime:objective-intake-test',
  level: 'debug',
});

async function main(): Promise<void> {
  const runtime = new AgentRuntime({
    logger,
  });

  await runtime.initialize();

  await runtime.acceptObjective({
    objective: 'Implement the first deterministic planning intake flow.',
    module: 'Planning Intake',
  });

  logger.info('Objective intake test completed', {
    state: runtime.getStateSnapshot(),
  });
}

main().catch((error: unknown) => {
  logger.error('Objective intake test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
