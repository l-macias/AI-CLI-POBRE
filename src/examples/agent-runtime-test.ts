import { AgentRuntime } from '../core/AgentRuntime.js';
import { Logger } from '../observability/Logger.js';

const logger = new Logger({
  namespace: 'zero-runtime:agent-runtime-test',
  level: 'debug',
});

async function main(): Promise<void> {
  const runtime = new AgentRuntime({
    logger,
  });

  await runtime.initialize();

  logger.info('Agent runtime test completed', {
    state: runtime.getStateSnapshot(),
    config: runtime.getConfig(),
  });
}

main().catch((error: unknown) => {
  logger.error('Agent runtime test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
