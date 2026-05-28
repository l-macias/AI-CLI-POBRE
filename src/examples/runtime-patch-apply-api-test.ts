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

function getArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} should be an array`);
  }

  return value;
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

  await writeFile(
    path.join(projectRoot, 'package.json'),
    `${JSON.stringify(
      {
        type: 'module',
        scripts: {
          typecheck: 'echo api sandbox typecheck ok',
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  await writeFile(
    path.join(projectRoot, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
          noEmit: true,
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    )}\n`,
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

  await writeFile(path.join(projectRoot, '.gitattributes'), '* text eol=lf\n', 'utf8');

  await execFileAsync(
    'git',
    ['add', '.gitattributes', 'package.json', 'tsconfig.json', 'src/example.ts'],
    {
      cwd: projectRoot,
      windowsHide: true,
    },
  );

  await execFileAsync('git', ['commit', '-m', 'initial commit'], {
    cwd: projectRoot,
    windowsHide: true,
  });
}

const testRoot = path.resolve('.runtime/runtime-patch-apply-api-test');
const projectRoot = path.join(testRoot, 'project');

await resetGitFixture(projectRoot);

const server = new RuntimeApiServer({
  config: {
    port: 17888,
  },
});

const started = await server.start();

try {
  const sessionResponse = await request({
    url: `${started.url}/sessions`,
    method: 'POST',
    body: {
      projectRoot,
      projectName: 'runtime-patch-apply-api-fixture',
      goal: 'Apply a controlled patch safely.',
    },
  });

  assert(sessionResponse.status === 'ok', 'session create should return ok');

  const session = getObject(sessionResponse['session'], 'session');
  const sessionId = getString(session['id'], 'session id');

  const patchResponse = await request({
    url: `${started.url}/patches/propose`,
    method: 'POST',
    body: {
      sessionId,
      planId: 'runtime-plan-session-87-api-test',
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

  assert(proposal['status'] === 'validated', 'proposal should be validated');

  const diffResponse = await request({
    url: `${started.url}/patches/diff`,
    method: 'POST',
    body: {
      proposal,
    },
  });

  assert(diffResponse.status === 'ok', JSON.stringify(diffResponse, null, 2));

  const diff = getObject(diffResponse['diff'], 'diff');

  const blockedApplyResponse = await request({
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

  assert(
    blockedApplyResponse.status === 'error',
    'real apply without sandbox and approval should error',
  );

  const dryRunResponse = await request({
    url: `${started.url}/patches/apply`,
    method: 'POST',
    body: {
      proposal,
      diff,
      applyConfirmed: false,
      dryRun: true,
      allowMissingRepository: false,
      allowDirtyWorkingTree: false,
    },
  });

  assert(dryRunResponse.status === 'ok', JSON.stringify(dryRunResponse, null, 2));

  const dryRunApply = getObject(dryRunResponse['apply'], 'dry run apply');

  assert(dryRunApply['status'] === 'dry_run', 'dry run should not write');

  const dryRunContent = await readFile(path.join(projectRoot, 'src', 'example.ts'), 'utf8');

  assert(dryRunContent === 'export const value = 1;\n', 'dry run must not apply patch');

  const approvalArtifactState = {
    sessionId,
    projectRoot,
    plan: null,
    proposal,
    diff,
    applyResult: null,
    lastVerifyRun: null,
    snapshotAvailable: false,
    dirtyWorkingTree: false,
  };

  const approvalCenterResponse = await request({
    url: `${started.url}/approvals/center`,
    method: 'POST',
    body: {
      artifactState: approvalArtifactState,
    },
  });

  assert(approvalCenterResponse.status === 'ok', JSON.stringify(approvalCenterResponse, null, 2));

  const approvalCenter = getObject(approvalCenterResponse['approvalCenter'], 'approval center');
  const approvalRequests = getArray(approvalCenter['requests'], 'approval requests');
  const patchApprovalRequest = approvalRequests
    .map((item) => getObject(item, 'approval request'))
    .find((requestItem) => requestItem['kind'] === 'patch');

  assert(patchApprovalRequest, 'Expected patch approval request.');

  const approvalResolveResponse = await request({
    url: `${started.url}/approvals/resolve`,
    method: 'POST',
    body: {
      artifactState: approvalArtifactState,
      decision: {
        requestId: getString(patchApprovalRequest['id'], 'patch approval request id'),
        action: 'approve',
      },
    },
  });

  assert(approvalResolveResponse.status === 'ok', JSON.stringify(approvalResolveResponse, null, 2));

  const approvalDecision = getObject(approvalResolveResponse['decision'], 'approval decision');

  assert(approvalDecision['accepted'] === true, 'Expected approval decision to be accepted.');

  const applyWithoutSandboxAfterApprovalResponse = await request({
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

  assert(
    applyWithoutSandboxAfterApprovalResponse.status === 'error',
    'real apply with approval but without sandbox should still error',
  );

  const sandboxResponse = await request({
    url: `${started.url}/patches/sandbox/verify`,
    method: 'POST',
    body: {
      proposal,
    },
  });

  assert(sandboxResponse.status === 'ok', JSON.stringify(sandboxResponse, null, 2));

  const sandbox = getObject(sandboxResponse['sandbox'], 'sandbox result');

  assert(sandbox['status'] === 'passed', JSON.stringify(sandboxResponse, null, 2));

  const wrongSandboxApplyResponse = await request({
    url: `${started.url}/patches/apply`,
    method: 'POST',
    body: {
      proposal,
      diff,
      sandboxResult: {
        ...sandbox,
        proposalId: 'wrong-proposal-id',
      },
      applyConfirmed: true,
      allowMissingRepository: false,
      allowDirtyWorkingTree: false,
      backupEnabled: true,
    },
  });

  assert(
    wrongSandboxApplyResponse.status === 'error',
    'real apply with wrong sandbox proposalId should error',
  );

  const applyResponse = await request({
    url: `${started.url}/patches/apply`,
    method: 'POST',
    body: {
      proposal,
      diff,
      sandboxResult: sandbox,
      applyConfirmed: true,
      allowMissingRepository: false,
      allowDirtyWorkingTree: false,
      backupEnabled: true,
    },
  });

  assert(applyResponse.status === 'ok', JSON.stringify(applyResponse, null, 2));

  const apply = getObject(applyResponse['apply'], 'apply');

  assert(apply['status'] === 'applied', 'confirmed apply should write after approval + sandbox');

  const appliedContent = await readFile(path.join(projectRoot, 'src', 'example.ts'), 'utf8');

  assert(
    appliedContent.includes('Runtime patch proposal placeholder'),
    'expected proposed content to be written',
  );

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'runtime-patch-apply-api-test',
        sessionId,
        proposalId: proposal['id'],
        diffId: diff['id'],
        dryRunStatus: dryRunApply['status'],
        approvalAccepted: approvalDecision['accepted'],
        sandboxStatus: sandbox['status'],
        wrongSandboxApplyStatus: wrongSandboxApplyResponse.status,
        applyStatus: apply['status'],
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
