import { readFile, rm } from 'node:fs/promises';
import { BenchmarkCaseFactory } from '../benchmarks/BenchmarkCaseFactory.js';
import { BenchmarkFixtureManager } from '../benchmarks/BenchmarkFixtureManager.js';
import { BenchmarkReportWriter } from '../benchmarks/BenchmarkReportWriter.js';
import { BenchmarkReporter } from '../benchmarks/BenchmarkReporter.js';
import { BenchmarkRunner } from '../benchmarks/BenchmarkRunner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const fixtureManager = new BenchmarkFixtureManager({
  rootDir: '.runtime/benchmark-report-persistence-fixtures',
});

const outputDir = '.runtime/benchmarks-test-output';

await rm(outputDir, {
  recursive: true,
  force: true,
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

const writer = new BenchmarkReportWriter({
  outputDir,
});

const writeResult = await writer.write({
  runId: run.id,
  report: {
    markdown: `${report.markdown}

Sensitive check:
API_KEY=super-secret-value
Bearer should-not-leak
sk-this-must-not-leak
`,
    json: {
      ...report.json,
      apiKey: 'sk-json-must-not-leak',
      nested: {
        password: 'password-must-not-leak',
        safeMetric: 123,
      },
    },
  },
});

const markdown = await readFile(writeResult.markdownPath, 'utf8');
const json = await readFile(writeResult.jsonPath, 'utf8');

assert(run.status === 'passed', 'Expected benchmark run to pass.');
assert(markdown.includes('Benchmark Report'), 'Expected persisted markdown report.');
assert(json.includes('"status": "passed"'), 'Expected persisted JSON status.');
assert(json.includes('"safeMetric": 123'), 'Expected safe JSON metric to remain visible.');

assert(!markdown.includes('super-secret-value'), 'Markdown API key leaked.');
assert(!markdown.includes('Bearer should-not-leak'), 'Markdown bearer token leaked.');
assert(!markdown.includes('sk-this-must-not-leak'), 'Markdown sk token leaked.');
assert(!json.includes('sk-json-must-not-leak'), 'JSON apiKey leaked.');
assert(!json.includes('password-must-not-leak'), 'JSON password leaked.');

let overwriteBlocked = false;

try {
  await writer.write({
    runId: run.id,
    report,
  });
} catch (error) {
  overwriteBlocked = error instanceof Error;
}

assert(overwriteBlocked, 'Expected duplicate benchmark report write to be blocked.');

await writer.write({
  runId: run.id,
  report,
  overwrite: true,
});

await fixtureManager.cleanup();
await rm(outputDir, {
  recursive: true,
  force: true,
});

console.log(
  JSON.stringify({
    message: 'End-to-end benchmark report persistence test completed',
    runId: run.id,
    writeResult,
  }),
);
