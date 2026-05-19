import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CliRunner } from '../cli/CliRunner.js';
import { createCliCommandRegistry } from '../cli/createCliCommandRegistry.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const fixtureRoot = resolve('.runtime/cli-security-review-test/project');

  await rm(resolve('.runtime/cli-security-review-test'), {
    recursive: true,
    force: true,
  });

  await mkdir(resolve(fixtureRoot, 'src'), {
    recursive: true,
  });

  await writeFile(
    resolve(fixtureRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'cli-security-review-fixture',
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
    'utf8',
  );

  await writeFile(resolve(fixtureRoot, 'src/index.ts'), 'export const value = 1;\n', 'utf8');

  const registry = createCliCommandRegistry();
  const registeredCommands = registry.list();

  assert(registeredCommands.includes('security'), 'Expected security command to be registered.');

  const runner = new CliRunner();

  const result = await runner.run([
    'security',
    'review',
    '--project',
    fixtureRoot,
    '--name',
    'CLI Security Review Fixture',
  ]);

  assert(result.status === 'ok', 'Expected security review command to succeed.');
  assert(result.command === 'security', 'Expected command to be security.');

  const output = getSecurityOutput(result.output);

  assert(output.action === 'review', 'Expected security review action.');
  assert(output.projectRoot === fixtureRoot, 'Expected security review project root.');
  const reportPath = requireString(output.reportPath, 'Expected security review report path.');

  assert(
    reportPath.endsWith('security-review-report.json'),
    'Expected security review report path.',
  );
  assert(output.summary?.status === 'failed', 'Expected malicious regression suite to fail.');
  assert((output.summary?.totalFindings ?? 0) > 0, 'Expected security review to produce findings.');

  const formatted = runner.format(result, 'text');

  assert(
    formatted.includes('Zero Runtime security review'),
    'Expected human-readable security review output.',
  );
  assert(formatted.includes('Status: failed'), 'Expected formatted failed status.');
  assert(!formatted.trim().startsWith('{'), 'Expected text output, not JSON.');

  const jsonFormatted = runner.format(result, 'json');

  assert(jsonFormatted.includes('"command": "security"'), 'Expected JSON formatted command.');

  const reportRaw = await readFile(reportPath, 'utf8');

  assert(reportRaw.includes('"version": 1'), 'Expected security review report JSON version.');
  assert(
    reportRaw.includes('"projectName": "CLI Security Review Fixture"'),
    'Expected configured project name in security report.',
  );
  assert(
    !reportRaw.includes('regression-secret-should-not-leak'),
    'Security review report must not leak regression secret material.',
  );
  assert(
    reportRaw.includes('[REDACTED]'),
    'Security review report should contain redaction marker.',
  );

  const invalidActionResult = await runner.run(['security', 'unknown', '--project', fixtureRoot]);

  assert(
    invalidActionResult.status === 'error',
    'Expected unknown security action to fail parsing.',
  );
  assert(
    invalidActionResult.command === 'help',
    'Expected parse failure to fallback to help command.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'cli-security-review-test',
        reportPath,
        reportStatus: output.summary?.status,
        totalFindings: output.summary?.totalFindings,
      },
      null,
      2,
    ),
  );
}

interface SecurityOutputLike {
  action?: string;
  projectRoot?: string;
  projectName?: string;
  reportPath?: string;
  summary?: {
    status?: string;
    totalFindings?: number;
    criticalFindings?: number;
    errorFindings?: number;
    warningFindings?: number;
    infoFindings?: number;
  };
}

function getSecurityOutput(output: unknown): SecurityOutputLike {
  if (typeof output !== 'object' || output === null || Array.isArray(output)) {
    throw new Error('Expected security command object output.');
  }

  return output;
}
function requireString(value: unknown, message: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(message);
  }

  return value;
}
main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'cli-security-review-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
