import { RuntimeReadinessCheck } from '../readiness/RuntimeReadinessCheck.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const checker = new RuntimeReadinessCheck();
const report = checker.run(process.cwd());

assert(report.checks.length >= 20, 'readiness check should include core files');
assert(report.status === 'passed', 'runtime readiness should pass before session 82');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-readiness-check-test',
      readiness: report.status,
      totalChecks: report.checks.length,
      failed: report.checks.filter((check) => check.status === 'failed'),
    },
    null,
    2,
  ),
);
