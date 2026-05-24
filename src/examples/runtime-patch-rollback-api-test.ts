import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { RuntimeApiServer } from '../api/RuntimeApiServer.js';

const execFileAsync = promisify(execFile);

interface ApiResponse {
  status?: string;
  [key: string]: unknown;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(input: {
  url: string;
  method?: 'GET' | 'POST';
  body?: unknown;
}): Promise<ApiResponse> {
  const init: RequestInit = {
    method: input.method ?? 'GET',
  };

  if (input.body !== undefined) {
    init.headers = {
      'content-type': 'application/json',
    };
    init.body = JSON.stringify(input.body);
  }

  const response = await fetch(input.url, init);

  return (await response.json()) as ApiResponse;
}

function getObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} should be an object`);
  }

  return value as Record<string, unknown>;
}

function getString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} should be a non-empty string`);
  }

  return value;
}

async function resetGitFixture(projectRoot: string): Promise<void> {
  await rm(projectRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(path.join(projectRoot, 'src'), {
    recursive: true,
  });

  await writeFile(path.join(projectRoot, 'src', 'example.ts'), 'export const value = 1;\n', 'utf8');

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

  await writeFile(path.join(projectRoot, '.gitattributes'), '* text eol=lf\n', 'utf8');

  await execFileAsync('git', ['add', '.'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['commit', '-m', 'initial commit'], {
    cwd: projectRoot,
    windowsHide: true,
  });
}

const testRoot = path.resolve('.runtime/runtime-patch-rollback-api-test');
const projectRoot = path.join(testRoot, 'project');

await resetGitFixture(projectRoot);

const server = new RuntimeApiServer({
  config: {
    port: 17890,
  },
});

const started = await server.start();

try {
  const sessionResponse = await request({
    url: `${started.url}/sessions`,
    method: 'POST',
    body: {
      projectRoot,
      projectName: 'runtime-patch-rollback-api-fixture',
      goal: 'Apply and rollback a controlled patch safely.',
    },
  });

  assert(sessionResponse.status === 'ok', JSON.stringify(sessionResponse, null, 2));

  const session = getObject(sessionResponse['session'], 'session');
  const sessionId = getString(session['id'], 'session id');

  const patchResponse = await request({
    url: `${started.url}/patches/propose`,
    method: 'POST',
    body: {
      sessionId,
      planId: 'runtime-plan-session-88-api-test',
      summary: 'Update example value safely.',
      riskLevel: 'low',
      candidateFiles: [
        {
          path: 'src/example.ts',
          existsKnown: true,
          reason: 'Example file is the selected controlled apply target.',
        },
      ],
      verifyCommands: [
        {
          command: 'npm',
          args: ['run', 'typecheck'],
          reason: 'Validate TypeScript after reviewed changes.',
          requiresApproval: true,
        },
      ],
    },
  });

  assert(patchResponse.status === 'ok', JSON.stringify(patchResponse, null, 2));

  const proposal = getObject(patchResponse['proposal'], 'proposal');

  const diffResponse = await request({
    url: `${started.url}/patches/diff`,
    method: 'POST',
    body: {
      proposal,
    },
  });

  assert(diffResponse.status === 'ok', JSON.stringify(diffResponse, null, 2));

  const diff = getObject(diffResponse['diff'], 'diff');

  const applyResponse = await request({
    url: `${started.url}/patches/apply`,
    method: 'POST',
    body: {
      proposal,
      diff,
      applyConfirmed: true,
      allowMissingRepository: false,
      allowDirtyWorkingTree: false,
      backupEnabled: true,
    },
  });

  assert(applyResponse.status === 'ok', JSON.stringify(applyResponse, null, 2));

  const apply = getObject(applyResponse['apply'], 'apply');

  assert(apply['status'] === 'applied', 'apply should be applied');

  const appliedContent = await readFile(path.join(projectRoot, 'src', 'example.ts'), 'utf8');

  assert(
    appliedContent.includes('Runtime patch proposal placeholder'),
    'expected patch content after apply',
  );

  const blockedRollbackResponse = await request({
    url: `${started.url}/patches/rollback`,
    method: 'POST',
    body: {
      applyResult: apply,
      rollbackConfirmed: false,
    },
  });

  assert(blockedRollbackResponse.status === 'ok', JSON.stringify(blockedRollbackResponse, null, 2));

  const blockedRollback = getObject(blockedRollbackResponse['rollback'], 'blocked rollback');

  assert(blockedRollback['status'] === 'blocked', 'rollback without confirmation should block');

  const dryRunRollbackResponse = await request({
    url: `${started.url}/patches/rollback`,
    method: 'POST',
    body: {
      applyResult: apply,
      rollbackConfirmed: false,
      dryRun: true,
    },
  });

  assert(dryRunRollbackResponse.status === 'ok', JSON.stringify(dryRunRollbackResponse, null, 2));

  const dryRunRollback = getObject(dryRunRollbackResponse['rollback'], 'dry run rollback');

  assert(dryRunRollback['status'] === 'dry_run', 'rollback dry run should succeed');

  const rollbackResponse = await request({
    url: `${started.url}/patches/rollback`,
    method: 'POST',
    body: {
      applyResult: apply,
      rollbackConfirmed: true,
    },
  });

  assert(rollbackResponse.status === 'ok', JSON.stringify(rollbackResponse, null, 2));

  const rollback = getObject(rollbackResponse['rollback'], 'rollback');

  assert(rollback['status'] === 'rolled_back', 'confirmed rollback should restore files');

  const restoredContent = await readFile(path.join(projectRoot, 'src', 'example.ts'), 'utf8');

  assert(restoredContent === 'export const value = 1;\n', 'rollback should restore original file');

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'runtime-patch-rollback-api-test',
        sessionId,
        applyId: apply['id'],
        rollbackId: rollback['id'],
        blockedRollbackStatus: blockedRollback['status'],
        dryRunRollbackStatus: dryRunRollback['status'],
        rollbackStatus: rollback['status'],
      },
      null,
      2,
    ),
  );
} finally {
  await server.stop();

  await rm(testRoot, {
    recursive: true,
    force: true,
  });
}
