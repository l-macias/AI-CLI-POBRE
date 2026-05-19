import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { StaticBenchmarkCase } from '../benchmarks/BenchmarkCase.js';
import { BenchmarkFixtureManager } from '../benchmarks/BenchmarkFixtureManager.js';
import { BenchmarkReporter } from '../benchmarks/BenchmarkReporter.js';
import { BenchmarkRunner } from '../benchmarks/BenchmarkRunner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const fixtureManager = new BenchmarkFixtureManager({
  rootDir: '.runtime/benchmark-tests',
});

const benchmarkCase = new StaticBenchmarkCase(
  {
    id: 'typescript-error-fix-basic',
    name: 'TypeScript error fix basic fixture',
    category: 'typescript_error_fix',
    description: 'Creates a reproducible TypeScript fixture and simulates one controlled fix step.',
    fixture: {
      id: 'typescript-error-fix-basic',
      name: 'TypeScript basic fixture',
      description: 'Small TypeScript fixture for benchmark infrastructure validation.',
      files: [
        {
          relativePath: 'package.json',
          content: JSON.stringify(
            {
              name: 'benchmark-fixture-typescript-basic',
              private: true,
              type: 'module',
              scripts: {
                typecheck: 'tsc --noEmit',
              },
              devDependencies: {
                typescript: '^5.7.2',
              },
            },
            null,
            2,
          ),
        },
        {
          relativePath: 'src/index.ts',
          content: `export function add(a: number, b: number): number {
  return a + b;
}

export const result = add(1, 2);
`,
        },
      ],
    },
    expectations: [
      {
        id: 'fixture-file-created',
        kind: 'file_exists',
        description: 'Fixture source file should exist.',
        target: 'src/index.ts',
      },
      {
        id: 'fixture-file-contains-export',
        kind: 'file_contains',
        description: 'Fixture source should contain exported function.',
        target: 'src/index.ts',
        expectedValue: 'export function add',
      },
    ],
    metadata: {
      providerExternal: false,
      networkRequired: false,
    },
  },
  async (context) => {
    const sourcePath = join(context.fixturePath, 'src/index.ts');
    const source = await readFile(sourcePath, 'utf8');

    assert(
      source.includes('export function add'),
      'Expected fixture source to contain add function.',
    );

    return {
      stepsExecuted: 1,
      actionsBlocked: 0,
      approvalsRequired: 0,
      replans: 0,
      recoveries: 0,
      metadata: {
        fixturePath: context.fixturePath,
        sourceBytes: source.length,
      },
    };
  },
);

const runner = new BenchmarkRunner({
  fixtureManager,
  runValidation: true,
});

const run = await runner.run([benchmarkCase]);

const reporter = new BenchmarkReporter();
const report = reporter.create(run);

assert(run.status === 'passed', 'Expected benchmark run to pass.');
assert(run.summary.totalCases === 1, 'Expected one benchmark case.');
assert(run.summary.passed === 1, 'Expected one passed benchmark case.');
assert(run.summary.failed === 0, 'Expected zero failed benchmark cases.');
assert(run.summary.successRate === 1, 'Expected success rate to be 1.');
assert(run.summary.totalStepsExecuted === 1, 'Expected one executed step.');
assert(run.summary.totalActionsBlocked === 0, 'Expected zero blocked actions.');
assert(report.markdown.includes('Benchmark Report'), 'Expected markdown benchmark report.');
assert(report.markdown.includes('typescript-error-fix-basic'), 'Expected case id in report.');

await fixtureManager.cleanup();

console.log(
  JSON.stringify({
    message: 'End-to-end benchmark projects test completed',
    run,
    report: {
      markdownLength: report.markdown.length,
      json: report.json,
    },
  }),
);
