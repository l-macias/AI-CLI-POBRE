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
  const projectRoot = resolve('.runtime/cli-quickstart-test/project');
  const reportPath = resolve(projectRoot, '.runtime/quickstart-report.md');

  await rm(resolve('.runtime/cli-quickstart-test'), {
    recursive: true,
    force: true,
  });

  const runner = new CliRunner();

  const result = await runner.run(['quickstart', '--project', projectRoot]);

  assert(result.status === 'ok', 'Expected quickstart to pass.');
  assert(result.command === 'quickstart', 'Expected quickstart command.');

  const formatted = runner.format(result, 'text');

  assertIncludes(formatted, 'Zero Runtime quickstart');
  assertIncludes(formatted, 'Status: ok');
  assertIncludes(formatted, 'Scaffold: patch_ready');
  assertIncludes(formatted, 'Dry run: dry_run');
  assertIncludes(formatted, 'Apply: applied');
  assertIncludes(formatted, 'Validation: passed');
  assertIncludes(formatted, 'Git:');
  assertIncludes(formatted, 'Working tree: dirty');
  assertIncludes(formatted, 'Changed files:');
  assertIncludes(formatted, '.runtime/proposals/auth-module.patch-proposal.json');
  assertIncludes(formatted, '.runtime/quickstart-report.md');
  assertIncludes(formatted, 'src/modules/auth/index.ts');
  assertIncludes(formatted, 'src/modules/auth/auth.service.ts');
  assertIncludes(formatted, 'src/modules/auth/auth.types.ts');
  assertIncludes(formatted, 'Generated files:');
  assertIncludes(formatted, 'Report:');
  assertIncludes(formatted, reportPath);
  assertIncludes(formatted, 'Next:');
  assertIncludes(formatted, 'Open the report artifact.');
  assertIncludes(formatted, 'Run git diff before keeping or reverting the demo output.');
  assertIncludes(formatted, 'Use zero agent start for an approval-gated real workflow.');

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
  assertIncludes(reportContent, `- Project root: ${projectRoot}`);
  assertIncludes(reportContent, '- Scaffold status: patch_ready');
  assertIncludes(reportContent, '- Dry-run status: dry_run');
  assertIncludes(reportContent, '- Apply status: applied');
  assertIncludes(reportContent, '- Validation status: passed');
  assertIncludes(reportContent, '- Git working tree: dirty');
  assertIncludes(reportContent, '## Changed files');
  assertIncludes(reportContent, '.runtime/proposals/auth-module.patch-proposal.json');
  assertIncludes(reportContent, '.runtime/quickstart-report.md');
  assertIncludes(reportContent, 'src/modules/auth/index.ts');
  assertIncludes(reportContent, 'src/modules/auth/auth.service.ts');
  assertIncludes(reportContent, 'src/modules/auth/auth.types.ts');
  assertIncludes(reportContent, 'zero scaffold module');
  assertIncludes(reportContent, 'zero patch apply');
  assertIncludes(reportContent, 'zero validate');
  assertIncludes(reportContent, 'zero git status');
  assertIncludes(reportContent, '--dry-run');
  assertIncludes(reportContent, '--confirm-apply');
  assertIncludes(reportContent, 'This quickstart uses the deterministic fake provider.');
  assertIncludes(reportContent, 'No real provider call is made.');
  assertIncludes(reportContent, 'Validation runs after apply.');
  assertIncludes(reportContent, 'Git status is captured after validation for auditability.');
  assertIncludes(reportContent, '## Purpose');
  assertIncludes(reportContent, '## Recommended next steps');
  assertIncludes(reportContent, 'The runtime remains the authority.');
  assertIncludes(reportContent, 'The provider does not directly write files.');
  assertIncludes(
    reportContent,
    'Run git diff before keeping or reverting the generated demo output.',
  );
  assertIncludes(reportContent, 'Use zero agent start for a real approval-gated workflow.');

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'cli-quickstart-test',
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
        test: 'cli-quickstart-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
