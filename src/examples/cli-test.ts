import { CliRunner } from '../cli/CliRunner.js';
import { Logger } from '../observability/Logger.js';

const logger = new Logger({
  namespace: 'zero-runtime:cli-test',
  level: 'debug',
});

async function main(): Promise<void> {
  const runner = new CliRunner();

  const helpResult = await runner.run(['help']);
  const contextResult = await runner.run(['context', '--max-tokens', '1000']);
  const validateResult = await runner.run(['validate']);
  const feedbackResult = await runner.run(['validation-feedback']);
  const codeIntelResult = await runner.run([
    'code-intel',
    '--file',
    'src/retrieval/ImportGraph.ts',
    '--query',
    'ImportGraph RetrievalTypes import relationships',
    '--max-chunks',
    '4',
  ]);
  const unknownResult = await runner.run(['unknown-command']);

  logger.info('CLI test completed', {
    helpResult,
    contextResult,
    validateResult,
    feedbackResult,
    codeIntelResult,
    unknownResult,
  });

  assertStatus(helpResult.status, 'ok');
  assertStatus(contextResult.status, 'ok');
  assertStatus(validateResult.status, 'ok');
  assertStatus(feedbackResult.status, 'ok');
  assertStatus(codeIntelResult.status, 'ok');
  assertStatus(unknownResult.status, 'error');

  if (helpResult.command !== 'help') {
    throw new Error('Expected help command.');
  }

  if (codeIntelResult.command !== 'code-intel') {
    throw new Error('Expected code-intel command.');
  }

  logger.info('Session 25 CLI test passed');
}

function assertStatus(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Expected status "${expected}", received "${actual}".`);
  }
}

main().catch((error: unknown) => {
  logger.error('CLI test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
