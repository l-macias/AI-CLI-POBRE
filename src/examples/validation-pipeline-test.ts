import { Logger } from '../observability/Logger.js';
import { ValidationOrchestrator } from '../validation/ValidationOrchestrator.js';

const logger = new Logger({
  namespace: 'zero-runtime:validation-pipeline-test',
  level: 'debug',
});

async function main(): Promise<void> {
  const orchestrator = new ValidationOrchestrator();

  logger.info('Starting validation pipeline test');

  const run = await orchestrator.runAll();
  const report = orchestrator.createMarkdownReport(run);

  logger.info('Validation pipeline test completed', {
    run,
    report,
  });
}

main().catch((error: unknown) => {
  logger.error('Validation pipeline test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
