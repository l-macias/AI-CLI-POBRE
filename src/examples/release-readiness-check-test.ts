import { ReleaseReadinessChecker } from '../release/ReleaseReadinessChecker.js';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function requireCheck(
  checks: readonly {
    readonly name: string;
    readonly status: string;
    readonly message: string;
  }[],
  name: string,
): void {
  const check = checks.find((candidate) => candidate.name === name);

  if (!check) {
    throw new Error(`Expected release readiness check: ${name}`);
  }

  if (check.status !== 'passed') {
    throw new Error(`Expected release readiness check to pass: ${name}. ${check.message}`);
  }
}

async function main(): Promise<void> {
  const checker = new ReleaseReadinessChecker();
  const report = await checker.check(process.cwd());

  assert(
    report.summary.failed === 0,
    `Expected release readiness report to have zero failed checks. Failed checks: ${report.checks
      .filter((check) => check.status === 'failed')
      .map((check) => `${check.name}: ${check.message}`)
      .join('; ')}`,
  );

  assert(report.summary.total > 0, 'Expected release readiness checks to run.');

  requireCheck(report.checks, 'file:package.json');
  requireCheck(report.checks, 'file:.env.example');
  requireCheck(report.checks, 'file:.gitignore');

  requireCheck(report.checks, 'package:name');
  requireCheck(report.checks, 'package:version');
  requireCheck(report.checks, 'package:type');
  requireCheck(report.checks, 'package:description');
  requireCheck(report.checks, 'package:description:includes:runtime-centered');

  requireCheck(report.checks, 'gitignore:contains:.env');
  requireCheck(report.checks, 'gitignore:contains:.env.local');
  requireCheck(report.checks, 'gitignore:contains:.runtime/');

  requireCheck(report.checks, 'script:check');
  requireCheck(report.checks, 'script:typecheck');
  requireCheck(report.checks, 'script:lint');
  requireCheck(report.checks, 'script:mvp:test');
  requireCheck(report.checks, 'script:rc:test');
  requireCheck(report.checks, 'script:release:readiness:test');
  requireCheck(report.checks, 'script:real-provider:test');
  requireCheck(report.checks, 'script:mvp:smoke:test');
  requireCheck(report.checks, 'script:product-flow:test');
  requireCheck(report.checks, 'script:cli:all:test');
  requireCheck(report.checks, 'script:cli:quickstart:test');
  requireCheck(report.checks, 'script:security:all:test');
  requireCheck(report.checks, 'script:agent:all:test');
  requireCheck(report.checks, 'script:memory:all:test');
  requireCheck(report.checks, 'script:provider:all:test');
  requireCheck(report.checks, 'script:repair:all:test');
  requireCheck(report.checks, 'script:patch:all:test');
  requireCheck(report.checks, 'script:scaffold:all:test');

  requireCheck(report.checks, 'script-includes:rc:test:npm run mvp:test');
  requireCheck(report.checks, 'script-includes:rc:test:npm run release:readiness:test');
  requireCheck(report.checks, 'script-includes:mvp:test:npm run check');
  requireCheck(report.checks, 'script-includes:mvp:test:npm run product-flow:test');
  requireCheck(report.checks, 'script-includes:mvp:test:npm run cli:all:test');
  requireCheck(report.checks, 'script-includes:mvp:test:npm run security:all:test');
  requireCheck(report.checks, 'script-includes:mvp:test:npm run memory:all:test');
  requireCheck(report.checks, 'script-includes:mvp:test:npm run provider:all:test');
  requireCheck(report.checks, 'script-includes:cli:all:test:npm run cli:quickstart:test');

  requireCheck(report.checks, 'script-excludes:mvp:test:real-provider:test');
  requireCheck(report.checks, 'script-excludes:mvp:test:repair:openrouter-smoke:test');
  requireCheck(report.checks, 'script-excludes:mvp:test:agent:real-provider-smoke:test');
  requireCheck(report.checks, 'script-excludes:rc:test:real-provider:test');
  requireCheck(report.checks, 'script-excludes:rc:test:repair:openrouter-smoke:test');
  requireCheck(report.checks, 'script-excludes:rc:test:agent:real-provider-smoke:test');
  requireCheck(report.checks, 'script-excludes:release:readiness:test:real-provider:test');
  requireCheck(report.checks, 'script-excludes:mvp:smoke:test:real-provider:test');

  requireCheck(report.checks, 'script-includes:real-provider:test:provider:openrouter-client:test');
  requireCheck(report.checks, 'script-includes:real-provider:test:repair:openrouter-smoke:test');
  requireCheck(report.checks, 'script-includes:real-provider:test:agent:real-provider-smoke:test');

  requireCheck(report.checks, 'file:src/examples/end-to-end-product-flow-test.ts');
  requireCheck(report.checks, 'file:src/examples/cli-quickstart-test.ts');
  requireCheck(report.checks, 'file:src/examples/release-readiness-check-test.ts');
  requireCheck(report.checks, 'file:src/examples/mvp-smoke-test.ts');
  requireCheck(report.checks, 'file:src/demo/DemoScenarioRunner.ts');
  requireCheck(report.checks, 'file:src/demo/DemoScenarioReporter.ts');
  requireCheck(report.checks, 'file:src/release/ReleaseReadinessChecker.ts');

  requireCheck(report.checks, 'dependency:zod');
  requireCheck(report.checks, 'dependency:tsx');
  requireCheck(report.checks, 'dependency:typescript');
  requireCheck(report.checks, 'dependency:eslint');

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'release-readiness-check-test',
        report,
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
        test: 'release-readiness-check-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
