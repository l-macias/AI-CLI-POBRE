import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { Logger } from '../observability/Logger.js';
import { PatchApplyRunner } from '../patch-apply/PatchApplyRunner.js';
import type { PatchProposal } from '../types/RepairTypes.js';

const execFileAsync = promisify(execFile);

const logger = new Logger({
  namespace: 'zero-runtime:patch-apply-test',
  level: 'debug',
});

async function main(): Promise<void> {
  const projectRoot = resolve('.runtime/patch-apply-tests/sample-project');

  await resetGitFixture(projectRoot);

  const runner = new PatchApplyRunner();

  const proposal: PatchProposal = {
    id: 'patch-apply-test-proposal',
    summary: 'Replace tracked file content.',
    riskLevel: 'low',
    operations: [
      {
        kind: 'replace_file',
        targetFile: 'src/example.ts',
        newContent: 'export const value = 2;\n',
        expectedCurrentContent: 'export const value = 1;\n',
        reason: 'Test controlled patch application.',
      },
    ],
    explanation: 'Test proposal.',
  };

  const dryRunResult = await runner.run({
    projectRoot,
    proposal,
    applyConfirmed: false,
    dryRun: true,
    allowDirtyWorkingTree: false,
  });

  if (dryRunResult.status !== 'dry_run') {
    throw new Error('Expected dry run patch to validate without applying.');
  }

  const dryRunContent = await readFile(resolve(projectRoot, 'src/example.ts'), 'utf8');

  if (dryRunContent !== 'export const value = 1;\n') {
    throw new Error('Expected dry run patch to avoid writing content.');
  }

  if (!dryRunResult.operationResults.every((operation) => operation.status === 'skipped')) {
    throw new Error('Expected dry run operations to be skipped.');
  }

  const cleanApplyResult = await runner.run({
    projectRoot,
    proposal,
    applyConfirmed: true,
    allowDirtyWorkingTree: false,
  });

  if (cleanApplyResult.status !== 'applied') {
    throw new Error('Expected confirmed clean patch to apply.');
  }

  const appliedContent = await readFile(resolve(projectRoot, 'src/example.ts'), 'utf8');

  if (appliedContent !== 'export const value = 2;\n') {
    throw new Error('Expected patched content to be written.');
  }

  const backup = cleanApplyResult.operationResults[0]?.backup;

  if (!backup?.backupPath) {
    throw new Error('Expected backup to be created.');
  }

  const backupContent = await readFile(backup.backupPath, 'utf8');

  if (backupContent !== 'export const value = 1;\n') {
    throw new Error('Expected backup to contain original content.');
  }

  await writeFile(resolve(projectRoot, 'dirty.txt'), 'dirty\n', 'utf8');

  const dirtySafeProposal: PatchProposal = {
    id: 'patch-apply-dirty-safe-test-proposal',
    summary: 'Patch dirty tree with matching expected content.',
    riskLevel: 'medium',
    operations: [
      {
        kind: 'replace_file',
        targetFile: 'src/example.ts',
        newContent: 'export const value = 3;\n',
        expectedCurrentContent: 'export const value = 2;\n',
        reason: 'Test allowDirtyWorkingTree with matching current content.',
      },
    ],
    explanation: 'Test dirty tree approval with content guard.',
  };

  const dirtyBlockedResult = await runner.run({
    projectRoot,
    proposal: dirtySafeProposal,
    applyConfirmed: true,
    allowDirtyWorkingTree: false,
  });

  if (dirtyBlockedResult.status !== 'blocked') {
    throw new Error('Expected dirty working tree to block patch application.');
  }

  if (!dirtyBlockedResult.issues.some((issue) => issue.code === 'PATCH_APPLY_GIT_GUARD_BLOCKED')) {
    throw new Error('Expected dirty tree git guard issue.');
  }

  const dirtyAllowedResult = await runner.run({
    projectRoot,
    proposal: dirtySafeProposal,
    applyConfirmed: true,
    allowDirtyWorkingTree: true,
  });

  if (dirtyAllowedResult.status !== 'applied') {
    throw new Error('Expected allowDirtyWorkingTree to allow patch application.');
  }

  const dirtyAllowedContent = await readFile(resolve(projectRoot, 'src/example.ts'), 'utf8');

  if (dirtyAllowedContent !== 'export const value = 3;\n') {
    throw new Error('Expected dirty allowed patch to write new content.');
  }

  await writeFile(resolve(projectRoot, 'src/example.ts'), 'unexpected external change\n', 'utf8');

  const mismatchProposal: PatchProposal = {
    id: 'patch-apply-mismatch-test-proposal',
    summary: 'Try to patch stale content.',
    riskLevel: 'medium',
    operations: [
      {
        kind: 'replace_file',
        targetFile: 'src/example.ts',
        newContent: 'export const value = 4;\n',
        expectedCurrentContent: 'export const value = 3;\n',
        reason: 'Should be blocked because current content changed.',
      },
    ],
    explanation: 'Test stale content protection.',
  };

  const mismatchBlockedResult = await runner.run({
    projectRoot,
    proposal: mismatchProposal,
    applyConfirmed: true,
    allowDirtyWorkingTree: true,
  });

  if (mismatchBlockedResult.status !== 'blocked') {
    throw new Error('Expected expectedCurrentContent mismatch to block patch application.');
  }

  if (
    !mismatchBlockedResult.issues.some(
      (issue) => issue.code === 'PATCH_APPLY_CURRENT_CONTENT_MISMATCH',
    )
  ) {
    throw new Error('Expected content mismatch issue.');
  }

  const deleteProposal: PatchProposal = {
    id: 'patch-apply-delete-test-proposal',
    summary: 'Delete file.',
    riskLevel: 'high',
    operations: [
      {
        kind: 'delete_file',
        targetFile: 'src/example.ts',
        reason: 'Test delete confirmation.',
      },
    ],
    explanation: 'Test delete proposal.',
  };

  const deleteBlockedResult = await runner.run({
    projectRoot,
    proposal: deleteProposal,
    applyConfirmed: true,
    allowDirtyWorkingTree: true,
  });

  if (deleteBlockedResult.status !== 'blocked') {
    throw new Error('Expected delete without confirmation to be blocked.');
  }

  if (!deleteBlockedResult.issues.some((issue) => issue.code === 'PATCH_DELETE_NOT_CONFIRMED')) {
    throw new Error('Expected delete confirmation issue.');
  }

  const secretProposal: PatchProposal = {
    id: 'patch-apply-secret-test-proposal',
    summary: 'Modify secret.',
    riskLevel: 'high',
    operations: [
      {
        kind: 'replace_file',
        targetFile: '.env',
        newContent: 'SECRET=changed\n',
        reason: 'Should be blocked.',
      },
    ],
    explanation: 'Test secret proposal.',
  };

  const secretBlockedResult = await runner.run({
    projectRoot,
    proposal: secretProposal,
    applyConfirmed: true,
    allowDirtyWorkingTree: true,
  });

  if (secretBlockedResult.status !== 'blocked') {
    throw new Error('Expected secret file patch to be blocked.');
  }

  if (
    !secretBlockedResult.issues.some((issue) => issue.code === 'PATCH_APPLY_SECRET_FILE_BLOCKED')
  ) {
    throw new Error('Expected secret file issue.');
  }

  logger.info('Patch apply test completed', {
    dryRun: dryRunResult.status,
    cleanApply: cleanApplyResult.status,
    dirtyBlocked: dirtyBlockedResult.status,
    dirtyAllowed: dirtyAllowedResult.status,
    mismatchBlocked: mismatchBlockedResult.status,
    deleteBlocked: deleteBlockedResult.status,
    secretBlocked: secretBlockedResult.status,
    backupPath: backup.backupPath,
    contentChecks: mismatchBlockedResult.contentChecks,
  });

  logger.info('Session 37 patch apply core test passed');
}

async function resetGitFixture(projectRoot: string): Promise<void> {
  await rm(projectRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(resolve(projectRoot, 'src'), {
    recursive: true,
  });

  await writeFile(resolve(projectRoot, 'src/example.ts'), 'export const value = 1;\n', 'utf8');

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

  await execFileAsync('git', ['add', '.gitattributes', 'src/example.ts'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['commit', '-m', 'initial commit'], {
    cwd: projectRoot,
    windowsHide: true,
  });
}

main().catch((error: unknown) => {
  logger.error('Patch apply test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
