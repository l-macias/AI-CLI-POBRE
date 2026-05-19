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
  const fixtureRoot = resolve('.runtime/cli-scaffold-module-test/project');

  await resetFixture(fixtureRoot);

  const registry = createCliCommandRegistry();

  assert(registry.list().includes('scaffold'), 'Expected scaffold command to be registered.');

  const runner = new CliRunner();

  const missingName = await runner.run([
    'scaffold',
    'module',
    '--project',
    fixtureRoot,
    '--target',
    'src/modules/auth',
  ]);

  assert(missingName.status === 'error', 'Expected missing scaffold name to fail.');
  assert(missingName.command === 'help', 'Expected parse failure fallback to help.');

  const openRouterBlocked = await runner.run([
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
    'openrouter',
    '--model',
    'poolside/laguna-xs.2:free',
  ]);

  assert(
    openRouterBlocked.status === 'error',
    'Expected OpenRouter scaffold without opt-in to fail.',
  );

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
    '--include-project-memory',
  ]);

  assert(result.status === 'ok', 'Expected scaffold module command to succeed.');
  assert(result.command === 'scaffold', 'Expected scaffold command.');

  const output = requireScaffoldOutput(result.output);

  assert(output.status === 'patch_ready', 'Expected patch_ready scaffold output.');
  assert(output.projectRoot === fixtureRoot, 'Expected project root.');
  assert(
    typeof output.reportPath === 'string' && output.reportPath.endsWith('scaffold-report.json'),
    'Expected scaffold report path.',
  );
  assert(output.operations.length === 3, 'Expected three scaffold operations.');
  assert(output.diffPreviews.length === 3, 'Expected three scaffold diff previews.');
  assert(
    output.operations.some((operation) => operation.targetFile === 'src/modules/auth/index.ts'),
    'Expected index.ts scaffold operation.',
  );
  assert(
    output.diffPreviews.every((preview) => preview.changed === true),
    'Expected changed diff previews.',
  );

  const formatted = runner.format(result, 'text');

  assert(formatted.includes('Zero Runtime scaffold'), 'Expected human-readable scaffold output.');
  assert(formatted.includes('Status: patch_ready'), 'Expected formatted patch_ready status.');
  assert(
    formatted.includes('src/modules/auth/index.ts'),
    'Expected formatted scaffold target file.',
  );
  assert(formatted.includes('```diff'), 'Expected formatted diff preview.');

  const jsonFormatted = runner.format(result, 'json');

  assert(
    jsonFormatted.includes('"command": "scaffold"'),
    'Expected JSON formatter scaffold command.',
  );

  const reportRaw = await readFile(output.reportPath, 'utf8');

  assert(reportRaw.includes('"status": "patch_ready"'), 'Expected patch_ready scaffold report.');
  assert(reportRaw.includes('"diffPreviews"'), 'Expected diff previews in scaffold report.');
  assert(reportRaw.includes('"patchProposal"'), 'Expected patch proposal in scaffold report.');

  const createdFile = await readOptionalFile(resolve(fixtureRoot, 'src/modules/auth/index.ts'));

  assert(createdFile === undefined, 'CLI scaffold must not write scaffold files directly.');

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'cli-scaffold-module-test',
        reportPath: output.reportPath,
        operations: output.operations.length,
        diffPreviews: output.diffPreviews.length,
      },
      null,
      2,
    ),
  );
}

interface ScaffoldOutputLike {
  status: string;
  projectRoot: string;
  reportPath: string;
  operations: ScaffoldOperationLike[];
  diffPreviews: ScaffoldDiffPreviewLike[];
}

interface ScaffoldOperationLike {
  kind?: string | undefined;
  targetFile?: string | undefined;
  reason?: string | undefined;
}

interface ScaffoldDiffPreviewLike {
  targetFile?: string | undefined;
  changed?: boolean | undefined;
  changedLines?: number | undefined;
  markdown?: string | undefined;
}

function requireScaffoldOutput(output: unknown): ScaffoldOutputLike {
  const record = requireRecord(output, 'scaffold output');

  return {
    status: requireString(record['status'], 'status'),
    projectRoot: requireString(record['projectRoot'], 'projectRoot'),
    reportPath: requireString(record['reportPath'], 'reportPath'),
    operations: requireRecordArray(record['operations'], 'operations').map(toOperation),
    diffPreviews: requireRecordArray(record['diffPreviews'], 'diffPreviews').map(toDiffPreview),
  };
}

function toOperation(record: Record<string, unknown>): ScaffoldOperationLike {
  return {
    kind: optionalString(record['kind']),
    targetFile: optionalString(record['targetFile']),
    reason: optionalString(record['reason']),
  };
}

function toDiffPreview(record: Record<string, unknown>): ScaffoldDiffPreviewLike {
  return {
    targetFile: optionalString(record['targetFile']),
    changed: optionalBoolean(record['changed']),
    changedLines: optionalNumber(record['changedLines']),
    markdown: optionalString(record['markdown']),
  };
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

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

async function resetFixture(projectRoot: string): Promise<void> {
  await rm(resolve('.runtime/cli-scaffold-module-test'), {
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
        name: 'cli-scaffold-module-fixture',
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
        test: 'cli-scaffold-module-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
