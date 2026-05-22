import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GitRepositoryDetectionResult } from '../git/GitAwarenessTypes.js';
import { ProjectScanner } from '../projects/ProjectScanner.js';
import { WorkspaceModeResolver } from '../workspace/WorkspaceModeResolver.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

class MissingGitRepositoryDetector {
  // eslint-disable-next-line @typescript-eslint/require-await
  public async detect(projectRoot: string): Promise<GitRepositoryDetectionResult> {
    return {
      projectRoot,
      repositoryState: 'missing',
      checkedAt: new Date().toISOString(),
      issues: [
        {
          code: 'GIT_REPOSITORY_NOT_FOUND',
          message: 'Project is not inside a git working tree.',
          severity: 'warning',
        },
      ],
    };
  }
}

const testRoot = path.resolve('.runtime/workspace-mode-test');
const projectRoot = path.join(testRoot, 'project');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await mkdir(path.join(projectRoot, 'src'), {
  recursive: true,
});

await writeFile(
  path.join(projectRoot, 'package.json'),
  JSON.stringify(
    {
      name: 'workspace-mode-project',
      dependencies: {
        express: '^4.0.0',
        react: '^18.0.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
    },
    null,
    2,
  ),
  'utf8',
);

await writeFile(path.join(projectRoot, 'tsconfig.json'), '{}\n', 'utf8');

const scanner = new ProjectScanner();

await scanner.scan({
  rootPath: projectRoot,
  name: 'workspace-mode-project',
  workingMode: 'local_snapshot',
  gitRequired: false,
});

const resolver = new WorkspaceModeResolver({
  gitDetector: new MissingGitRepositoryDetector(),
});

const localSnapshot = await resolver.createSession({
  projectRoot,
});

assert(localSnapshot.mode === 'local_snapshot', 'default config mode should be local_snapshot');
assert(localSnapshot.gitRequired === false, 'local_snapshot should not require Git');
assert(localSnapshot.gitAvailable === false, 'local_snapshot should continue without Git');
assert(localSnapshot.status === 'ready', 'local_snapshot should be ready without Git');
assert(localSnapshot.canRead === true, 'local_snapshot should allow reads');
assert(localSnapshot.canWrite === true, 'local_snapshot should allow writes after snapshot policy');
assert(
  localSnapshot.requiresSnapshotBeforeWrite === true,
  'local_snapshot should require snapshot before write',
);
assert(
  localSnapshot.requiresGitBeforeWrite === false,
  'local_snapshot should not require Git before write',
);

const patchless = await resolver.createSession({
  projectRoot,
  requestedMode: 'local_patchless',
});

assert(patchless.mode === 'local_patchless', 'requested mode should override config');
assert(patchless.gitRequired === false, 'local_patchless should not require Git');
assert(patchless.gitAvailable === false, 'local_patchless should continue without Git');
assert(patchless.status === 'ready', 'local_patchless should be ready without Git');
assert(patchless.canRead === true, 'local_patchless should allow reads');
assert(patchless.canWrite === false, 'local_patchless should block writes');

const gitDiff = await resolver.createSession({
  projectRoot,
  requestedMode: 'git_diff',
});

assert(gitDiff.mode === 'git_diff', 'git_diff mode should resolve');
assert(gitDiff.gitRequired === true, 'git_diff should require Git');
assert(gitDiff.gitAvailable === false, 'git_diff test project should not have Git available');
assert(gitDiff.status === 'blocked', 'git_diff should block without repository');
assert(gitDiff.canWrite === false, 'blocked git_diff should not allow writes');

const gitBranchPr = await resolver.resolve({
  projectRoot,
  requestedMode: 'git_branch_pr',
});

assert(gitBranchPr.gitRequired === true, 'git_branch_pr should require Git');
assert(
  gitBranchPr.gitAvailable === false,
  'git_branch_pr test project should not have Git available',
);
assert(gitBranchPr.status === 'blocked', 'git_branch_pr should block without repository');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'workspace-mode-test',
      localSnapshot: {
        mode: localSnapshot.mode,
        status: localSnapshot.status,
        gitAvailable: localSnapshot.gitAvailable,
        canWrite: localSnapshot.canWrite,
        requiresSnapshotBeforeWrite: localSnapshot.requiresSnapshotBeforeWrite,
      },
      patchless: {
        mode: patchless.mode,
        status: patchless.status,
        gitAvailable: patchless.gitAvailable,
        canWrite: patchless.canWrite,
      },
      gitDiff: {
        mode: gitDiff.mode,
        status: gitDiff.status,
        gitRequired: gitDiff.gitRequired,
        gitAvailable: gitDiff.gitAvailable,
      },
    },
    null,
    2,
  ),
);
