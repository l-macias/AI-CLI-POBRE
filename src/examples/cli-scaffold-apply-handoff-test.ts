import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { CliRunner } from '../cli/CliRunner.js';

const execFileAsync = promisify(execFile);

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const fixtureRoot = resolve('.runtime/cli-scaffold-apply-handoff-test/project');
  const proposalRelativePath = '.runtime/proposals/auth-module.patch-proposal.json';
  const proposalAbsolutePath = resolve(fixtureRoot, proposalRelativePath);

  await resetFixture(fixtureRoot);

  const runner = new CliRunner();

  const scaffoldResult = await runner.run([
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

  assert(scaffoldResult.status === 'ok', 'Expected scaffold handoff command to succeed.');
  assert(scaffoldResult.command === 'scaffold', 'Expected scaffold command.');

  const scaffoldOutput = requireScaffoldOutput(scaffoldResult.output);

  assert(scaffoldOutput.status === 'patch_ready', 'Expected scaffold patch_ready result.');
  assert(
    scaffoldOutput.proposalOutputPath === proposalAbsolutePath,
    'Expected scaffold proposal output path.',
  );

  const beforeApplyContent = await readOptionalFile(
    resolve(fixtureRoot, 'src/modules/auth/index.ts'),
  );

  assert(beforeApplyContent === undefined, 'Scaffold command must not write files before apply.');

  const proposalRaw = await readFile(proposalAbsolutePath, 'utf8');
  const proposal = parseJsonObject(proposalRaw, 'saved patch proposal');
  const proposalOperations = requireRecordArray(proposal['operations'], 'proposal operations');

  assert(proposalOperations.length === 3, 'Expected three proposal operations before apply.');
  assert(
    proposalOperations.every((operation) => operation['kind'] === 'create_file'),
    'Expected create_file operations before apply.',
  );

  const applyResult = await runner.run([
    'patch',
    'apply',
    '--project',
    fixtureRoot,
    '--proposal',
    proposalAbsolutePath,
    '--confirm-apply',
    '--allow-dirty',
  ]);

  if (applyResult.status !== 'ok') {
    throw new Error(
      [
        'Expected patch apply command to run.',
        `Command: ${applyResult.command}`,
        `Issues: ${JSON.stringify(applyResult.issues, null, 2)}`,
        `Output: ${JSON.stringify(applyResult.output, null, 2)}`,
      ].join('\n'),
    );
  }

  assert(applyResult.command === 'patch', 'Expected patch command.');

  const applyOutput = requirePatchApplyOutput(applyResult.output);

  if (applyOutput.status !== 'applied') {
    throw new Error(
      [
        'Expected scaffold patch proposal to be applied.',
        `Apply output: ${JSON.stringify(applyResult.output, null, 2)}`,
      ].join('\n'),
    );
  }
  assert(applyOutput.proposalId === 'patch-from-scaffold-proposal-auth', 'Expected proposal id.');
  assert(applyOutput.operationResults.length === 3, 'Expected three patch operation results.');
  assert(
    applyOutput.operationResults.every((operation) => operation.status === 'applied'),
    'Expected all scaffold patch operations to be applied.',
  );

  const indexContent = await readFile(resolve(fixtureRoot, 'src/modules/auth/index.ts'), 'utf8');
  const serviceContent = await readFile(
    resolve(fixtureRoot, 'src/modules/auth/auth.service.ts'),
    'utf8',
  );
  const typesContent = await readFile(
    resolve(fixtureRoot, 'src/modules/auth/auth.types.ts'),
    'utf8',
  );

  assert(
    indexContent.includes("export * from './auth.service.js';"),
    'Expected generated index export.',
  );
  assert(
    serviceContent.includes('export class AuthService'),
    'Expected generated AuthService class.',
  );
  assert(
    typesContent.includes('export interface AuthConfig'),
    'Expected generated AuthConfig interface.',
  );

  const applyFormatted = runner.format(applyResult, 'text');

  assert(
    applyFormatted.includes('applied'),
    'Expected human-readable patch apply output to include applied status.',
  );
  assert(
    applyFormatted.includes('src/modules/auth/index.ts') ||
      applyFormatted.includes('src/modules/auth/auth.service.ts') ||
      applyFormatted.includes('src/modules/auth/auth.types.ts'),
    'Expected human-readable patch apply output to include scaffold target files.',
  );

  const scaffoldReportRaw = await readFile(
    resolve(fixtureRoot, '.runtime/scaffold-report.json'),
    'utf8',
  );

  assert(
    scaffoldReportRaw.includes('"patchProposal"'),
    'Expected scaffold report to include patchProposal.',
  );
  assert(
    scaffoldReportRaw.includes('"diffPreviews"'),
    'Expected scaffold report to include diffPreviews.',
  );

  const patchApplyReportRaw = await readOptionalFile(
    resolve(fixtureRoot, '.runtime/patch-apply-report.json'),
  );

  if (patchApplyReportRaw !== undefined) {
    assert(
      patchApplyReportRaw.includes('"status": "applied"'),
      'Expected patch apply report applied status.',
    );
    assert(
      patchApplyReportRaw.includes('"operationResults"'),
      'Expected patch apply operation results report.',
    );
  }

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'cli-scaffold-apply-handoff-test',
        scaffoldStatus: scaffoldOutput.status,
        patchApplyStatus: applyOutput.status,
        operations: applyOutput.operationResults.length,
        proposalOutputPath: scaffoldOutput.proposalOutputPath,
      },
      null,
      2,
    ),
  );
}

interface ScaffoldOutputLike {
  status: string;
  proposalOutputPath: string;
}

interface PatchApplyOutputLike {
  status: string;
  proposalId: string;
  operationResults: PatchApplyOperationOutputLike[];
}

interface PatchApplyOperationOutputLike {
  targetFile: string;
  kind: string;
  status: string;
  message: string;
}

function requireScaffoldOutput(output: unknown): ScaffoldOutputLike {
  const record = requireRecord(output, 'scaffold output');

  return {
    status: requireString(record['status'], 'scaffold status'),
    proposalOutputPath: requireString(record['proposalOutputPath'], 'proposalOutputPath'),
  };
}

function requirePatchApplyOutput(output: unknown): PatchApplyOutputLike {
  const record = requireRecord(output, 'patch apply output');

  return {
    status: requireString(record['status'], 'patch apply status'),
    proposalId: requireString(record['proposalId'], 'proposalId'),
    operationResults: requireRecordArray(record['operationResults'], 'operationResults').map(
      toPatchApplyOperationOutput,
    ),
  };
}

function toPatchApplyOperationOutput(
  record: Record<string, unknown>,
): PatchApplyOperationOutputLike {
  return {
    targetFile: requireString(record['targetFile'], 'operation targetFile'),
    kind: requireString(record['kind'], 'operation kind'),
    status: requireString(record['status'], 'operation status'),
    message: requireString(record['message'], 'operation message'),
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

async function readOptionalFile(targetPath: string): Promise<string | undefined> {
  try {
    return await readFile(targetPath, 'utf8');
  } catch {
    return undefined;
  }
}

async function resetFixture(projectRoot: string): Promise<void> {
  await rm(resolve('.runtime/cli-scaffold-apply-handoff-test'), {
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
        name: 'cli-scaffold-apply-handoff-fixture',
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

  await execFileAsync('git', ['init', '-b', 'test-branch'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'user.email', 'zero-runtime@example.local'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'user.name', 'Zero Runtime Test'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'core.autocrlf', 'false'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'core.eol', 'lf'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await writeFile(resolve(projectRoot, '.gitattributes'), '* text eol=lf\n', 'utf8');

  await execFileAsync('git', ['add', '.'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['commit', '-m', 'initial commit'], {
    cwd: projectRoot,
    windowsHide: true,
  });
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'cli-scaffold-apply-handoff-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
