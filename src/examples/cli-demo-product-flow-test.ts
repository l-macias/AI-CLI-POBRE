import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CliRunner } from '../cli/CliRunner.js';

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
  const projectRoot = resolve('.runtime/cli-demo-product-flow-test/project');
  const reportPath = resolve(projectRoot, '.runtime/quickstart-report.md');

  await rm(resolve('.runtime/cli-demo-product-flow-test'), {
    recursive: true,
    force: true,
  });

  const runner = new CliRunner();

  const result = await runner.run(['demo', 'product-flow', '--project', projectRoot]);

  assert(result.status === 'ok', 'Expected demo product-flow to pass.');
  assert(result.command === 'demo', 'Expected demo command.');

  const formatted = runner.format(result, 'text');

  assertIncludes(formatted, 'Zero Runtime demo');
  assertIncludes(formatted, 'Action: product-flow');
  assertIncludes(formatted, 'Status: ok');
  assertIncludes(formatted, 'Scaffold: patch_ready');
  assertIncludes(formatted, 'Dry run: dry_run');
  assertIncludes(formatted, 'Apply: applied');
  assertIncludes(formatted, 'Validation: passed');
  assertIncludes(formatted, 'Git:');
  assertIncludes(formatted, 'Working tree: dirty');
  assertIncludes(formatted, 'Changed files:');
  assertIncludes(formatted, 'Report:');
  assertIncludes(formatted, reportPath);
  assertIncludes(formatted, '.runtime/proposals/auth-module.patch-proposal.json');
  assertIncludes(formatted, '.runtime/quickstart-report.md');
  assertIncludes(formatted, 'src/modules/auth/index.ts');
  assertIncludes(formatted, 'src/modules/auth/auth.service.ts');
  assertIncludes(formatted, 'src/modules/auth/auth.types.ts');

  const indexContent = await readFile(resolve(projectRoot, 'src/modules/auth/index.ts'), 'utf8');
  const serviceContent = await readFile(
    resolve(projectRoot, 'src/modules/auth/auth.service.ts'),
    'utf8',
  );
  const typesContent = await readFile(
    resolve(projectRoot, 'src/modules/auth/auth.types.ts'),
    'utf8',
  );

  assert(
    indexContent.includes("export * from './auth.service.js';"),
    'Expected generated index export.',
  );
  assert(serviceContent.includes('export class AuthService'), 'Expected AuthService class.');
  assert(typesContent.includes('export interface AuthConfig'), 'Expected AuthConfig interface.');

  const reportContent = await readFile(reportPath, 'utf8');

  assertIncludes(reportContent, '# Zero Runtime Quickstart Report');
  assertIncludes(reportContent, 'zero scaffold module');
  assertIncludes(reportContent, 'zero patch apply');
  assertIncludes(reportContent, 'zero validate');
  assertIncludes(reportContent, 'zero git status');
  assertIncludes(reportContent, '- Validation status: passed');
  assertIncludes(reportContent, '- Git working tree: dirty');
  assertIncludes(reportContent, '## Changed files');
  assertIncludes(reportContent, 'No real provider call is made.');

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'cli-demo-product-flow-test',
        projectRoot,
        reportPath,
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
        test: 'cli-demo-product-flow-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
