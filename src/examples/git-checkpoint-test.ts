import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { DirtyTreeGuard } from '../git/DirtyTreeGuard.js';
import { GitClient } from '../git/GitClient.js';
import { GitStatusParser } from '../git/GitStatusParser.js';
import { PreChangeSnapshot } from '../git/PreChangeSnapshot.js';
import { Logger } from '../observability/Logger.js';
import type { ToolExecutionRequest, ToolExecutionResult } from '../types/ToolTypes.js';
import { ToolExecutionValidator } from '../tools/ToolExecutionValidator.js';
import { ToolPermissionManager } from '../tools/ToolPermissionManager.js';
import { ToolPermissionPolicy } from '../tools/ToolPermissionPolicy.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { ToolRuntimeExecutor } from '../tools/ToolRuntimeExecutor.js';
import { GitCheckpointTool } from '../tools/git/GitCheckpointTool.js';
import { GitDiffTool } from '../tools/git/GitDiffTool.js';
import { GitRestoreTool } from '../tools/git/GitRestoreTool.js';
import { GitStatusTool } from '../tools/git/GitStatusTool.js';

const execFileAsync = promisify(execFile);

const logger = new Logger({
  namespace: 'zero-runtime:git-checkpoint-test',
  level: 'debug',
});

const repoRoot = path.resolve(process.cwd(), '.runtime/git-tests/sample-repo');

let requestSequence = 0;

async function main(): Promise<void> {
  await resetRepository();

  const client = new GitClient({
    cwd: repoRoot,
  });

  const registry = new ToolRegistry();

  registry.register(new GitStatusTool({ client }));
  registry.register(new GitDiffTool({ client }));
  registry.register(new GitCheckpointTool({ client }));
  registry.register(new GitRestoreTool({ client }));

  const executor = new ToolRuntimeExecutor({
    validator: new ToolExecutionValidator({
      registry,
      permissionPolicy: new ToolPermissionPolicy({
        allowedPermissions: ['read', 'write', 'execute'],
      }),
    }),
    permissionManager: new ToolPermissionManager({
      allowedPermissions: ['read', 'write', 'execute'],
    }),
  });

  await writeFile(path.join(repoRoot, 'tracked.txt'), 'changed content\n', 'utf8');
  await writeFile(path.join(repoRoot, 'new-file.txt'), 'new content\n', 'utf8');

  const statusResult = await executor.execute(
    createRequest({
      toolName: 'git_status',
      requestInput: {},
    }),
  );

  const diffResult = await executor.execute(
    createRequest({
      toolName: 'git_diff',
      requestInput: {
        target: 'tracked.txt',
      },
    }),
  );

  const snapshot = new PreChangeSnapshot().evaluate(getGitStatusOutput(statusResult));

  const checkpointResult = await executor.execute(
    createRequest({
      toolName: 'git_checkpoint',
      requestInput: {
        message: 'test checkpoint',
        confirmCheckpoint: true,
        allowProtectedBranch: true,
      },
    }),
  );

  await writeFile(path.join(repoRoot, 'tracked.txt'), 'post checkpoint change\n', 'utf8');

  const checkpointOutput = getOutputRecord(checkpointResult);
  const commitHash = checkpointOutput['commitHash'];

  if (typeof commitHash !== 'string') {
    throw new Error('Expected git checkpoint output to include commitHash.');
  }

  const restoreResult = await executor.execute(
    createRequest({
      toolName: 'git_restore',
      requestInput: {
        ref: commitHash,
        files: ['tracked.txt'],
        restoreConfirmed: true,
      },
    }),
  );

  const restoredContent = await readFile(path.join(repoRoot, 'tracked.txt'), 'utf8');

  const cleanStatusOutput = await client.run(['status', '--porcelain']);
  const cleanFiles = new GitStatusParser().parsePorcelain(cleanStatusOutput.stdout);
  const cleanGuard = new DirtyTreeGuard().requireClean({
    repositoryRoot: repoRoot,
    branch: 'test-branch',
    clean: cleanFiles.length === 0,
    files: cleanFiles,
    checkedAt: new Date().toISOString(),
  });

  logger.info('Git checkpoint test completed', {
    statusResult,
    diffResult,
    snapshot,
    checkpointResult,
    restoreResult,
    cleanGuard,
    restoredContent,
  });

  assertStatus(statusResult.status, 'executed');
  assertStatus(diffResult.status, 'executed');
  assertStatus(checkpointResult.status, 'executed');
  assertStatus(restoreResult.status, 'executed');

  if (!snapshot.shouldCheckpoint) {
    throw new Error('Expected pre-change snapshot to recommend checkpoint.');
  }

  if (restoredContent !== 'changed content\n') {
    throw new Error(`Expected restored content from checkpoint, received: ${restoredContent}`);
  }

  logger.info('Session 28 git checkpoint test passed');
}

async function resetRepository(): Promise<void> {
  await rm(repoRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(repoRoot, {
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

function createRequest(input: { toolName: string; requestInput: unknown }): ToolExecutionRequest {
  requestSequence += 1;

  return {
    id: `git-tool-request-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}-${String(requestSequence).padStart(3, '0')}`,
    toolName: input.toolName,
    input: input.requestInput,
    proposedBy: 'runtime',
    requestedAt: new Date().toISOString(),
  };
}

function getOutputRecord(result: ToolExecutionResult): Record<string, unknown> {
  if (typeof result.output === 'object' && result.output !== null) {
    return result.output as Record<string, unknown>;
  }

  throw new Error(`Expected output object for ${result.toolName}.`);
}

function getGitStatusOutput(result: ToolExecutionResult): {
  repositoryRoot: string;
  branch: string;
  clean: boolean;
  files: Array<{
    path: string;
    indexStatus: string;
    workingTreeStatus: string;
    kind: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'unknown';
  }>;
  checkedAt: string;
} {
  const output = getOutputRecord(result);

  return output as {
    repositoryRoot: string;
    branch: string;
    clean: boolean;
    files: Array<{
      path: string;
      indexStatus: string;
      workingTreeStatus: string;
      kind: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'unknown';
    }>;
    checkedAt: string;
  };
}

function assertStatus(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Expected status "${expected}", received "${actual}".`);
  }
}

main().catch((error: unknown) => {
  logger.error('Git checkpoint test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
