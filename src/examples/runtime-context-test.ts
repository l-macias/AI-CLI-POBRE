import { Logger } from '../observability/Logger.js';
import { RuntimeInitializer } from '../core/RuntimeInitializer.js';

const logger = new Logger({
  namespace: 'zero-runtime:runtime-context-test',
  level: 'debug',
});

async function main(): Promise<void> {
  const initializer = new RuntimeInitializer();

  const context = await initializer.initialize({
    maxEstimatedContextTokens: 1500,
  });

  logger.info('Runtime context initialized', {
    sourceCount: context.sources.length,
    sources: context.sources.map((source) => source.name),
    tokenEstimate: context.tokenEstimate,
    contextLength: context.assembledContext.length,
  });
}

main().catch((error: unknown) => {
  logger.error('Runtime context initialization failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
