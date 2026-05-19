import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { GitChangeBoundary } from '../git/GitChangeBoundary.js';
import { GitDiffReader } from '../git/GitDiffReader.js';
import { GitReadOnlyClient } from '../git/GitReadOnlyClient.js';
import { GitRepositoryDetector } from '../git/GitRepositoryDetector.js';
import { GitReporter } from '../git/GitReporter.js';
import { GitStatusReader } from '../git/GitStatusReader.js';
import { GitWorkingTreeGuard } from '../git/GitWorkingTreeGuard.js';
import { Logger } from '../observability/Logger.js';

const execFileAsync = promisify(execFile);

const logger = new Logger({
  namespace: 'zero-runtime:git-awareness-test',
  level: 'debug',
});

const repoRoot = path.resolve(process.cwd(), '.runtime/git-awareness-tests/sample-repo');
const nonRepoRoot = path.join(os.tmpdir(), `zero-runtime-non-git-${process.pid}-${Date.now()}`);

async function main(): Promise<void> {
  await resetFixtures();

  const detector = new GitRepositoryDetector();
  const statusReader = new GitStatusReader();
  const diffReader = new GitDiffReader();
  const boundaryReader = new GitChangeBoundary();
  const strictGuard = new GitWorkingTreeGuard();
  const relaxedGuard = new GitWorkingTreeGuard({
    allowDirtyWorkingTree: true,
  });
  const reporter = new GitReporter();

  const cleanDetection = await detector.detect(repoRoot);
  const cleanStatus = await statusReader.read(repoRoot);
  const cleanBoundary = await boundaryReader.capture(repoRoot);
  const cleanGuard = strictGuard.evaluate(cleanBoundary);

  await writeFile(path.join(repoRoot, 'tracked.txt'), 'changed content\n', 'utf8');
  await writeFile(path.join(repoRoot, 'untracked.txt'), 'untracked content\n', 'utf8');

  const dirtyStatus = await statusReader.read(repoRoot);
  const diff = await diffReader.read({
    projectRoot: repoRoot,
    target: 'tracked.txt',
  });
  const dirtyBoundary = await boundaryReader.capture(repoRoot);
  const dirtyStrictGuard = strictGuard.evaluate(dirtyBoundary);
  const dirtyRelaxedGuard = relaxedGuard.evaluate(dirtyBoundary);

  const missingDetection = await detector.detect(nonRepoRoot);
  const missingStatus = await statusReader.read(nonRepoRoot);

  const statusText = reporter.statusToText(dirtyStatus);
  const diffText = reporter.diffToText(diff);
  const boundaryText = reporter.boundaryToText({
    boundary: dirtyBoundary,
    guard: dirtyStrictGuard,
  });

  logger.info('Git awareness test completed', {
    cleanDetection,
    cleanStatus,
    cleanBoundary,
    cleanGuard,
    dirtyStatus,
    diff: {
      changed: diff.changed,
      truncated: diff.truncated,
      diffLength: diff.diff.length,
    },
    dirtyBoundary,
    dirtyStrictGuard,
    dirtyRelaxedGuard,
    missingDetection,
    missingStatus,
    statusTextIncludesRepository: statusText.includes('Git status'),
    diffTextIncludesRepository: diffText.includes('Git diff'),
    boundaryTextIncludesRepository: boundaryText.includes('Git change boundary'),
  });

  if (cleanDetection.repositoryState !== 'present') {
    throw new Error('Expected git repository to be detected.');
  }

  if (!cleanStatus.clean) {
    throw new Error('Expected initial working tree to be clean.');
  }

  if (!cleanGuard.allowed) {
    throw new Error('Expected clean working tree to be allowed.');
  }

  if (dirtyStatus.clean) {
    throw new Error('Expected dirty working tree.');
  }

  if (!dirtyStatus.files.some((file) => file.path === 'tracked.txt' && file.kind === 'modified')) {
    throw new Error('Expected tracked.txt to be modified.');
  }

  if (
    !dirtyStatus.files.some((file) => file.path === 'untracked.txt' && file.kind === 'untracked')
  ) {
    throw new Error('Expected untracked.txt to be untracked.');
  }

  if (!diff.changed || !diff.diff.includes('changed content')) {
    throw new Error('Expected diff to include changed content.');
  }

  if (dirtyStrictGuard.allowed) {
    throw new Error('Expected strict guard to block dirty working tree.');
  }

  if (!dirtyRelaxedGuard.allowed) {
    throw new Error('Expected relaxed guard to allow dirty working tree.');
  }

  if (missingDetection.repositoryState !== 'missing') {
    throw new Error('Expected missing git repository detection.');
  }

  if (missingStatus.workingTreeState !== 'unknown') {
    throw new Error('Expected missing repository status to be unknown.');
  }

  await assertReadOnlyClientRejectsWriteCommand();
  await rm(nonRepoRoot, {
    recursive: true,
    force: true,
  });
  logger.info('Session 36 git awareness test passed');
}

async function resetFixtures(): Promise<void> {
  await rm(path.resolve(process.cwd(), '.runtime/git-awareness-tests'), {
    recursive: true,
    force: true,
  });

  await rm(nonRepoRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(repoRoot, {
    recursive: true,
  });

  await mkdir(nonRepoRoot, {
    recursive: true,
  });

  await execFileAsync('git', ['init', '-b', 'test-branch'], {
    cwd: repoRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'user.email', 'zero-runtime@example.local'], {
    cwd: repoRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'user.name', 'Zero Runtime Test'], {
    cwd: repoRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'core.autocrlf', 'false'], {
    cwd: repoRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'core.eol', 'lf'], {
    cwd: repoRoot,
    windowsHide: true,
  });

  await writeFile(path.join(repoRoot, '.gitattributes'), '* text eol=lf\n', 'utf8');
  await writeFile(path.join(repoRoot, 'tracked.txt'), 'initial content\n', 'utf8');

  await execFileAsync('git', ['add', '.gitattributes', 'tracked.txt'], {
    cwd: repoRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['commit', '-m', 'initial commit'], {
    cwd: repoRoot,
    windowsHide: true,
  });
}

async function assertReadOnlyClientRejectsWriteCommand(): Promise<void> {
  const client = new GitReadOnlyClient({
    cwd: repoRoot,
  });

  try {
    await client.run(['add', '--all']);
  } catch {
    return;
  }

  throw new Error('Expected GitReadOnlyClient to reject write command.');
}

main().catch((error: unknown) => {
  logger.error('Git awareness test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
