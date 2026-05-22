import { ReleaseReadinessChecker } from '../release/ReleaseReadinessChecker.js';
import { CliRunner } from '../cli/CliRunner.js';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const readiness = await new ReleaseReadinessChecker().check(projectRoot);
  const runner = new CliRunner();

  const helpResult = await runner.run(['help', '--format', 'json']);
  const doctorResult = await runner.run(['doctor', '--project', projectRoot, '--format', 'json']);
  const memoryListResult = await runner.run([
    'memory',
    'list',
    '--project',
    projectRoot,
    '--format',
    'json',
  ]);

  assert(
    readiness.summary.failed === 0,
    `Expected release readiness to have zero failed checks. Failed: ${readiness.checks
      .filter((check) => check.status === 'failed')
      .map((check) => `${check.name}: ${check.message}`)
      .join('; ')}`,
  );

  assert(helpResult.status === 'ok', 'Expected CLI help to pass.');
  assert(doctorResult.command === 'doctor', 'Expected doctor command to be routed.');
  assert(
    doctorResult.status === 'ok' || doctorResult.status === 'error',
    'Expected doctor command to return controlled result.',
  );
  assert(memoryListResult.command === 'memory', 'Expected memory command to be routed.');
  assert(memoryListResult.status === 'ok', 'Expected memory list command to pass.');

  const forbiddenRealProviderChecks = readiness.checks.filter((check) => {
    return (
      check.name.includes('script-excludes:mvp:test') ||
      check.name.includes('script-excludes:rc:test') ||
      check.name.includes('script-excludes:mvp:smoke:test')
    );
  });

  assert(
    forbiddenRealProviderChecks.every((check) => check.status === 'passed'),
    'Expected deterministic release gates to exclude real-provider scripts.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'mvp-smoke-test',
        releaseReadinessStatus: readiness.status,
        failedReadinessChecks: readiness.summary.failed,
        warningReadinessChecks: readiness.summary.warnings,
        helpStatus: helpResult.status,
        doctorStatus: doctorResult.status,
        memoryStatus: memoryListResult.status,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'mvp-smoke-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
