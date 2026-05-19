import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CliRunner } from '../cli/CliRunner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const fixtureRoot = resolve('.runtime/cli-scaffold-handoff-test/project');
  const proposalRelativePath = '.runtime/proposals/auth-module.patch-proposal.json';

  await resetFixture(fixtureRoot);

  const runner = new CliRunner();

  const result = await runner.run([
    'scaffold',
    'module',
    '--project',
    fixtureRoot,
    '--name',
    'auth',
    '--kind',
    'backend',
    '--target',
    'src/modules/auth',
    '--provider',
    'fake-llm',
    '--save-proposal',
    proposalRelativePath,
  ]);

  assert(result.status === 'ok', 'Expected scaffold handoff command to succeed.');
  assert(result.command === 'scaffold', 'Expected scaffold command.');

  const output = requireScaffoldHandoffOutput(result.output);

  assert(output.status === 'patch_ready', 'Expected patch_ready scaffold result.');
  assert(
    output.proposalOutputPath.endsWith(proposalRelativePath.replaceAll('/', '\\')) ||
      output.proposalOutputPath.endsWith(proposalRelativePath),
    'Expected proposal output path.',
  );

  const proposalRaw = await readFile(output.proposalOutputPath, 'utf8');
  const proposal = parseJsonObject(proposalRaw, 'saved patch proposal');

  assert(
    proposal['id'] === 'patch-from-scaffold-proposal-auth',
    'Expected saved patch proposal id.',
  );
  assert(Array.isArray(proposal['operations']), 'Expected operations array.');

  const operations = requireRecordArray(proposal['operations'], 'operations');

  assert(operations.length === 3, 'Expected three saved operations.');
  assert(
    operations.some((operation) => operation['targetFile'] === 'src/modules/auth/index.ts'),
    'Expected saved index.ts operation.',
  );

  const formatted = runner.format(result, 'text');

  assert(
    formatted.includes('Patch proposal:'),
    'Expected formatted output to include patch proposal path.',
  );
  assert(
    formatted.includes('auth-module.patch-proposal.json'),
    'Expected formatted output to include saved proposal filename.',
  );

  const createdFile = await readOptionalFile(resolve(fixtureRoot, 'src/modules/auth/index.ts'));

  assert(createdFile === undefined, 'Scaffold handoff must not write scaffold files directly.');

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'cli-scaffold-handoff-test',
        proposalOutputPath: output.proposalOutputPath,
        operations: operations.length,
      },
      null,
      2,
    ),
  );
}

interface ScaffoldHandoffOutputLike {
  status: string;
  proposalOutputPath: string;
}

function requireScaffoldHandoffOutput(output: unknown): ScaffoldHandoffOutputLike {
  const record = requireRecord(output, 'scaffold handoff output');

  return {
    status: requireString(record['status'], 'status'),
    proposalOutputPath: requireString(record['proposalOutputPath'], 'proposalOutputPath'),
  };
}

function parseJsonObject(raw: string, label: string): Record<string, unknown> {
  const parsed = JSON.parse(raw) as unknown;

  return requireRecord(parsed, label);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected object: ${label}`);
  }

  return value as Record<string, unknown>;
}

function requireRecordArray(value: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected array: ${label}`);
  }

  return value.map((item, index) => requireRecord(item, `${label}[${String(index)}]`));
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Expected string: ${label}`);
  }

  return value;
}

async function resetFixture(projectRoot: string): Promise<void> {
  await rm(resolve('.runtime/cli-scaffold-handoff-test'), {
    recursive: true,
    force: true,
  });

  await mkdir(resolve(projectRoot, 'src/modules'), {
    recursive: true,
  });

  await writeFile(
    resolve(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'cli-scaffold-handoff-fixture',
        dependencies: {
          express: '^5.0.0',
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

  await writeFile(resolve(projectRoot, 'package-lock.json'), '{}\n', 'utf8');

  await writeFile(
    resolve(projectRoot, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ),
    'utf8',
  );
}

async function readOptionalFile(targetPath: string): Promise<string | undefined> {
  try {
    return await readFile(targetPath, 'utf8');
  } catch {
    return undefined;
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'cli-scaffold-handoff-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
