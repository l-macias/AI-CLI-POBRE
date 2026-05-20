import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DemoScenarioRunner } from '../demo/DemoScenarioRunner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(value: string, expected: string): void {
  if (!value.includes(expected)) {
    throw new Error(`Expected output to include "${expected}".`);
  }
}

async function main(): Promise<void> {
  const runner = new DemoScenarioRunner();
  const projectRoot = resolve('.runtime/end-to-end-product-flow-test/project');
  const expectedReportPath = resolve(projectRoot, '.runtime/quickstart-report.md');

  const result = await runner.run({
    projectRoot,
  });

  assert(result.status === 'ok', 'Expected product flow status ok.');
  assert(result.projectRoot === projectRoot, 'Expected resolved project root.');
  assert(result.reportPath === expectedReportPath, 'Expected quickstart report path.');
  assert(result.scaffoldStatus === 'patch_ready', 'Expected scaffold patch_ready.');
  assert(result.dryRunStatus === 'dry_run', 'Expected patch dry_run.');
  assert(result.applyStatus === 'applied', 'Expected patch applied.');
  assert(result.validationStatus === 'passed', 'Expected validation passed.');
  assert(result.gitWorkingTreeStatus === 'dirty', 'Expected dirty git working tree.');

  assert(
    result.generatedFiles.includes('src/modules/auth/index.ts'),
    'Expected generated auth index.',
  );
  assert(
    result.generatedFiles.includes('src/modules/auth/auth.service.ts'),
    'Expected generated auth service.',
  );
  assert(
    result.generatedFiles.includes('src/modules/auth/auth.types.ts'),
    'Expected generated auth types.',
  );

  assert(
    result.changedFiles.includes('.runtime/proposals/auth-module.patch-proposal.json'),
    'Expected saved patch proposal in changed files.',
  );
  assert(
    result.changedFiles.includes('.runtime/quickstart-report.md'),
    'Expected quickstart report in changed files.',
  );
  assert(
    result.changedFiles.includes('src/modules/auth/index.ts'),
    'Expected generated index in changed files.',
  );
  assert(
    result.changedFiles.includes('src/modules/auth/auth.service.ts'),
    'Expected generated service in changed files.',
  );
  assert(
    result.changedFiles.includes('src/modules/auth/auth.types.ts'),
    'Expected generated types in changed files.',
  );

  const reportContent = await readFile(result.reportPath, 'utf8');

  assertIncludes(reportContent, '# Zero Runtime Quickstart Report');
  assertIncludes(reportContent, '## Purpose');
  assertIncludes(reportContent, '## Summary');
  assertIncludes(reportContent, '## Generated files');
  assertIncludes(reportContent, '## Changed files');
  assertIncludes(reportContent, '## Equivalent commands');
  assertIncludes(reportContent, '## Safety notes');
  assertIncludes(reportContent, '## Recommended next steps');

  assertIncludes(reportContent, `- Project root: ${projectRoot}`);
  assertIncludes(reportContent, `- Report path: ${expectedReportPath}`);
  assertIncludes(reportContent, '- Scaffold status: patch_ready');
  assertIncludes(reportContent, '- Dry-run status: dry_run');
  assertIncludes(reportContent, '- Apply status: applied');
  assertIncludes(reportContent, '- Validation status: passed');
  assertIncludes(reportContent, '- Git working tree: dirty');

  assertIncludes(reportContent, 'zero scaffold module');
  assertIncludes(reportContent, 'zero patch apply');
  assertIncludes(reportContent, '--dry-run');
  assertIncludes(reportContent, '--confirm-apply');
  assertIncludes(reportContent, 'zero validate');
  assertIncludes(reportContent, 'zero git status');

  assertIncludes(reportContent, 'The runtime remains the authority.');
  assertIncludes(reportContent, 'This quickstart uses the deterministic fake provider.');
  assertIncludes(reportContent, 'No real provider call is made.');
  assertIncludes(reportContent, 'No premium model is used.');
  assertIncludes(reportContent, 'The provider does not directly write files.');
  assertIncludes(reportContent, 'A dry-run is executed before apply.');
  assertIncludes(reportContent, 'Validation runs after apply.');
  assertIncludes(reportContent, 'Git status is captured after validation for auditability.');

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'end-to-end-product-flow-test',
        result,
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
        test: 'end-to-end-product-flow-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
