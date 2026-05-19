import { BenchmarkCaseFactory } from '../benchmarks/BenchmarkCaseFactory.js';
import { BenchmarkFixtureManager } from '../benchmarks/BenchmarkFixtureManager.js';
import { BenchmarkReporter } from '../benchmarks/BenchmarkReporter.js';
import { BenchmarkRunner } from '../benchmarks/BenchmarkRunner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const fixtureManager = new BenchmarkFixtureManager({
  rootDir: '.runtime/benchmark-suite-tests',
});

const factory = new BenchmarkCaseFactory();
const cases = factory.createDefaultSuite();

const runner = new BenchmarkRunner({
  fixtureManager,
  runValidation: true,
});

const run = await runner.run(cases);

const reporter = new BenchmarkReporter();
const report = reporter.create(run);

assert(run.status === 'passed', 'Expected benchmark suite run to pass.');
assert(run.summary.totalCases === 7, 'Expected seven benchmark cases.');
assert(run.summary.passed === 7, 'Expected seven passed cases.');
assert(run.summary.failed === 0, 'Expected zero failed cases.');
assert(run.summary.successRate === 1, 'Expected success rate to be 1.');
assert(run.summary.totalStepsExecuted === 9, 'Expected nine executed steps.');
assert(run.summary.totalActionsBlocked === 1, 'Expected one blocked action.');
assert(run.summary.totalApprovalsRequired === 7, 'Expected seven approvals required.');
assert(run.summary.totalReplans === 1, 'Expected one replan.');
assert(run.summary.totalRecoveries === 1, 'Expected one recovery.');
assert(report.markdown.includes('Benchmark Report'), 'Expected markdown benchmark report.');
assert(report.markdown.includes('typescript-error-fix-basic'), 'Expected TypeScript case.');
assert(report.markdown.includes('eslint-fix-unused-var-basic'), 'Expected ESLint case.');
assert(report.markdown.includes('react-refactor-component-basic'), 'Expected React refactor case.');
assert(report.markdown.includes('package-migration-basic'), 'Expected package migration case.');
assert(
  report.markdown.includes('multi-file-import-refactor-basic'),
  'Expected multi-file import refactor case.',
);
assert(report.markdown.includes('runtime-loop-recovery-basic'), 'Expected recovery case.');
assert(report.markdown.includes('retrieval-guided-edit-basic'), 'Expected retrieval case.');

await fixtureManager.cleanup();

console.log(
  JSON.stringify({
    message: 'End-to-end benchmark suite test completed',
    summary: run.summary,
    report: {
      markdownLength: report.markdown.length,
      json: report.json,
    },
  }),
);
