import { mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ProtectedPathPolicy } from '../security/ProtectedPathPolicy.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const fixtureRoot = path.resolve('.runtime/security-protected-path-policy-test');
  const projectRoot = path.join(fixtureRoot, 'project');
  const outsideRoot = path.join(fixtureRoot, 'outside');

  await rm(fixtureRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(path.join(projectRoot, 'src'), {
    recursive: true,
  });

  await mkdir(outsideRoot, {
    recursive: true,
  });

  await writeFile(path.join(projectRoot, 'src/index.ts'), 'export const value = 1;\n', 'utf8');
  await writeFile(path.join(outsideRoot, 'secret.txt'), 'outside secret\n', 'utf8');

  const policy = new ProtectedPathPolicy();

  const safe = policy.validateTarget({
    projectRoot,
    targetPath: 'src/index.ts',
    operation: 'patch',
    source: 'security-protected-path-policy-test',
  });

  assert(safe.allowed, 'Normal source file should be allowed.');
  assert(safe.findings.length === 0, 'Normal source file should not produce findings.');
  assert(
    safe.normalizedTargetPath === 'src/index.ts',
    'Policy should preserve normalized relative source path.',
  );
  assert(
    typeof safe.absoluteTargetPath === 'string' &&
      safe.absoluteTargetPath.endsWith(path.join('src', 'index.ts')),
    'Policy should resolve absolute target path inside project root.',
  );

  const envFile = policy.validateTarget({
    projectRoot,
    targetPath: '.env',
    operation: 'patch',
    source: 'security-protected-path-policy-test',
  });

  assert(!envFile.allowed, '.env should be blocked.');
  assert(
    envFile.findings.some((finding) => finding.code === 'PROTECTED_PATH_TARGET_BLOCKED'),
    '.env should produce protected target finding.',
  );

  const envNestedFile = policy.validateTarget({
    projectRoot,
    targetPath: 'config/.env.production',
    operation: 'write',
    source: 'security-protected-path-policy-test',
  });

  assert(!envNestedFile.allowed, 'Nested env file should be blocked.');
  assert(
    envNestedFile.findings.some((finding) => finding.code === 'PROTECTED_PATH_TARGET_BLOCKED'),
    'Nested env file should produce protected target finding.',
  );

  const gitPath = policy.validateTarget({
    projectRoot,
    targetPath: '.git/config',
    operation: 'write',
    source: 'security-protected-path-policy-test',
  });

  assert(!gitPath.allowed, '.git paths should be blocked.');
  assert(
    gitPath.findings.some((finding) => finding.code === 'PROTECTED_PATH_TARGET_BLOCKED'),
    '.git path should produce protected target finding.',
  );

  const dependencyPath = policy.validateTarget({
    projectRoot,
    targetPath: 'node_modules/pkg/index.js',
    operation: 'write',
    source: 'security-protected-path-policy-test',
  });

  assert(!dependencyPath.allowed, 'node_modules paths should be blocked.');

  const buildPath = policy.validateTarget({
    projectRoot,
    targetPath: 'dist/index.js',
    operation: 'write',
    source: 'security-protected-path-policy-test',
  });

  assert(!buildPath.allowed, 'dist paths should be blocked.');

  const traversal = policy.validateTarget({
    projectRoot,
    targetPath: '../outside/secret.txt',
    operation: 'patch',
    source: 'security-protected-path-policy-test',
  });

  assert(!traversal.allowed, 'Path traversal should be blocked.');
  assert(
    traversal.findings.some((finding) => finding.code === 'PROTECTED_PATH_TRAVERSAL_BLOCKED'),
    'Path traversal should produce traversal finding.',
  );
  assert(
    traversal.findings.some((finding) => finding.code === 'PROTECTED_PATH_ROOT_ESCAPE_BLOCKED'),
    'Path traversal should produce root escape finding.',
  );

  const normalizedTraversal = policy.validateTarget({
    projectRoot,
    targetPath: 'src/../index.ts',
    operation: 'patch',
    source: 'security-protected-path-policy-test',
  });

  assert(!normalizedTraversal.allowed, 'Normalized traversal segments should be blocked.');
  assert(
    normalizedTraversal.findings.some(
      (finding) => finding.code === 'PROTECTED_PATH_TRAVERSAL_BLOCKED',
    ),
    'Normalized traversal should produce traversal finding.',
  );

  const absolutePath = policy.validateTarget({
    projectRoot,
    targetPath: path.resolve(projectRoot, 'src/index.ts'),
    operation: 'patch',
    source: 'security-protected-path-policy-test',
  });

  assert(!absolutePath.allowed, 'Absolute paths should be blocked.');
  assert(
    absolutePath.findings.some((finding) => finding.code === 'PROTECTED_PATH_ABSOLUTE_BLOCKED'),
    'Absolute path should produce absolute path finding.',
  );

  const runtimeReport = policy.validateTarget({
    projectRoot,
    targetPath: '.runtime/security-review-report.md',
    operation: 'report',
    source: 'security-protected-path-policy-test',
  });

  assert(runtimeReport.allowed, 'Runtime report path should be allowed by default.');

  const runtimeState = policy.validateTarget({
    projectRoot,
    targetPath: '.runtime/project-memory.json',
    operation: 'write',
    source: 'security-protected-path-policy-test',
  });

  assert(!runtimeState.allowed, 'Protected runtime state files should be blocked.');

  const strictRuntimePolicy = new ProtectedPathPolicy({
    allowRuntimeDirectory: false,
  });

  const runtimeAnyFile = strictRuntimePolicy.validateTarget({
    projectRoot,
    targetPath: '.runtime/security-review-report.md',
    operation: 'report',
    source: 'security-protected-path-policy-test',
  });

  assert(
    !runtimeAnyFile.allowed,
    'Strict runtime policy should block the whole .runtime directory.',
  );

  const customPolicy = new ProtectedPathPolicy({
    protectedPathFragments: ['generated-secrets'],
    protectedFileNames: ['runtime.private'],
  });

  const customProtectedDirectory = customPolicy.validateTarget({
    projectRoot,
    targetPath: 'src/generated-secrets/output.ts',
    operation: 'write',
    source: 'security-protected-path-policy-test',
  });

  assert(!customProtectedDirectory.allowed, 'Custom protected directory should be blocked.');

  const customProtectedFile = customPolicy.validateTarget({
    projectRoot,
    targetPath: 'src/runtime.private',
    operation: 'write',
    source: 'security-protected-path-policy-test',
  });

  assert(!customProtectedFile.allowed, 'Custom protected file should be blocked.');

  const filesystemSafe = await policy.validateTargetWithFilesystem({
    projectRoot,
    targetPath: 'src/index.ts',
    operation: 'patch',
    source: 'security-protected-path-policy-test',
  });

  assert(filesystemSafe.allowed, 'Existing normal file should pass filesystem-aware validation.');

  let symlinkCheckSkipped = false;

  try {
    const symlinkPath = path.join(projectRoot, 'src/linked-outside');

    await symlink(outsideRoot, symlinkPath, process.platform === 'win32' ? 'junction' : 'dir');

    const symlinkResult = await policy.validateTargetWithFilesystem({
      projectRoot,
      targetPath: 'src/linked-outside/secret.txt',
      operation: 'write',
      source: 'security-protected-path-policy-test',
    });

    assert(!symlinkResult.allowed, 'Symlink traversal should be blocked.');
    assert(
      symlinkResult.findings.some((finding) => finding.code === 'PROTECTED_PATH_SYMLINK_BLOCKED'),
      'Symlink traversal should produce symlink finding.',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      process.platform === 'win32' &&
      (message.includes('EPERM') || message.includes('privilege'))
    ) {
      symlinkCheckSkipped = true;
    } else {
      throw error;
    }
  }

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'security-protected-path-policy-test',
        symlinkCheckSkipped,
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
        test: 'security-protected-path-policy-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
