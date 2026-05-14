import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ProjectBootstrapper } from '../bootstrap/ProjectBootstrapper.js';
import { Logger } from '../observability/Logger.js';

const logger = new Logger({
  namespace: 'zero-runtime:project-bootstrapper-test',
  level: 'debug',
});

const testRoot = path.resolve(process.cwd(), '.runtime/bootstrap-tests/sample-project');

async function main(): Promise<void> {
  await resetTestRoot();

  await writeFile(
    path.join(testRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'sample-project',
        dependencies: {
          next: '^15.0.0',
          react: '^19.0.0',
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

  await writeFile(
    path.join(testRoot, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  await mkdir(path.join(testRoot, 'src'), {
    recursive: true,
  });

  const bootstrapper = new ProjectBootstrapper();

  const preview = await bootstrapper.preview(testRoot);

  const unconfirmedWrite = await bootstrapper.write({
    rootDir: testRoot,
    confirmCreate: false,
  });

  const writeResult = await bootstrapper.write({
    rootDir: testRoot,
    confirmCreate: true,
  });

  const secondPreview = await bootstrapper.preview(testRoot);

  const blockedExistingRuntimeWrite = await bootstrapper.write({
    rootDir: testRoot,
    confirmCreate: true,
  });

  const runtimeConfig = await readFile(path.join(testRoot, '.runtime/runtime-config.json'), 'utf8');

  logger.info('Project bootstrapper test completed', {
    preview: {
      status: preview.status,
      stacks: preview.stack.stacks,
      packageManager: preview.stack.packageManager,
      fileCount: preview.files.length,
      runtimeExists: preview.inspection.runtimeExists,
    },
    unconfirmedWrite,
    writeResult,
    secondPreview: {
      status: secondPreview.status,
      runtimeExists: secondPreview.inspection.runtimeExists,
      existingFiles: secondPreview.inspection.existingFiles,
    },
    blockedExistingRuntimeWrite,
    runtimeConfig,
  });

  assertEqual(preview.status, 'ready');
  assertIncludes(preview.stack.stacks, 'typescript');
  assertIncludes(preview.stack.stacks, 'next');
  assertIncludes(preview.stack.stacks, 'react');

  assertEqual(unconfirmedWrite.status, 'blocked');
  assertEqual(writeResult.status, 'written');
  assertEqual(writeResult.writtenFiles.length, 12);

  assertEqual(secondPreview.status, 'blocked');
  assertEqual(blockedExistingRuntimeWrite.status, 'blocked');

  if (!runtimeConfig.includes('"allowShellTools": false')) {
    throw new Error('Expected runtime config to disable shell tools.');
  }

  if (!runtimeConfig.includes('"allowGitTools": false')) {
    throw new Error('Expected runtime config to disable git tools.');
  }

  if (!runtimeConfig.includes('"allowNetworkTools": false')) {
    throw new Error('Expected runtime config to disable network tools.');
  }

  logger.info('Session 26 project bootstrapper test passed');
}

async function resetTestRoot(): Promise<void> {
  await rm(testRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(testRoot, {
    recursive: true,
  });
}

function assertEqual(actual: string | number, expected: string | number): void {
  if (actual !== expected) {
    throw new Error(`Expected "${String(expected)}", received "${String(actual)}".`);
  }
}

function assertIncludes(values: string[], expected: string): void {
  if (!values.includes(expected)) {
    throw new Error(`Expected "${expected}" in: ${values.join(', ')}`);
  }
}

main().catch((error: unknown) => {
  logger.error('Project bootstrapper test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
