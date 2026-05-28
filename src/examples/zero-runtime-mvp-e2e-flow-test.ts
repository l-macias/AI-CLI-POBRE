import { createHash } from 'node:crypto';
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

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function resetGitFixture(projectRoot: string): Promise<void> {
  await rm(projectRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(path.join(projectRoot, 'src'), {
    recursive: true,
  });

  const initialContent = 'export const value: number = 1;\n';

  await writeFile(path.join(projectRoot, 'src', 'value.ts'), initialContent, 'utf8');

  await writeFile(
    path.join(projectRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'zero-runtime-mvp-e2e-flow-fixture',
        type: 'module',
        scripts: {
          typecheck: 'tsc --noEmit',
        },
        devDependencies: {
          typescript: '^5.0.0',
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

  await execFileAsync('git', ['add', '.'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['commit', '-m', 'initial commit'], {
    cwd: projectRoot,
    windowsHide: true,
  });
}

async function approvePatch(input: {
  baseUrl: string;
  sessionId: string;
  projectRoot: string;
  proposal: Record<string, unknown>;
  diff: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const artifactState = {
    sessionId: input.sessionId,
    projectRoot: input.projectRoot,
    plan: null,
    proposal: input.proposal,
    diff: input.diff,
    applyResult: null,
    lastVerifyRun: null,
    snapshotAvailable: false,
    dirtyWorkingTree: false,
  };

  const approvalCenterResponse = await request({
    url: `${input.baseUrl}/approvals/center`,
    method: 'POST',
    body: {
      artifactState,
    },
  });

  assert(approvalCenterResponse.status === 'ok', JSON.stringify(approvalCenterResponse, null, 2));

  const approvalCenter = getObject(approvalCenterResponse['approvalCenter'], 'approval center');
  const requests = getArray(approvalCenter['requests'], 'approval requests');

  const patchRequest = requests
    .map((item) => getObject(item, 'approval request'))
    .find((item) => item['kind'] === 'patch');

  assert(patchRequest, 'Expected patch approval request.');

  const resolveResponse = await request({
    url: `${input.baseUrl}/approvals/resolve`,
    method: 'POST',
    body: {
      artifactState,
      decision: {
        requestId: getString(patchRequest['id'], 'patch approval request id'),
        action: 'approve',
      },
    },
  });

  assert(resolveResponse.status === 'ok', JSON.stringify(resolveResponse, null, 2));

  const decision = getObject(resolveResponse['decision'], 'approval decision');

  assert(decision['accepted'] === true, 'Expected approval decision to be accepted.');

  return decision;
}

const testRoot = path.resolve('.runtime/zero-runtime-mvp-e2e-flow-test');
const projectRoot = path.join(testRoot, 'project');

await resetGitFixture(projectRoot);

const server = new RuntimeApiServer({
  config: {
    port: 17892,
  },
});

const started = await server.start();

try {
  const originalContent = await readFile(path.join(projectRoot, 'src', 'value.ts'), 'utf8');

  const sessionResponse = await request({
    url: `${started.url}/sessions`,
    method: 'POST',
    body: {
      projectRoot,
      projectName: 'zero-runtime-mvp-e2e-flow-fixture',
      goal: 'Safely update a TypeScript value through sandbox recovery.',
    },
  });

  assert(sessionResponse.status === 'ok', JSON.stringify(sessionResponse, null, 2));

  const session = getObject(sessionResponse['session'], 'session');
  const sessionId = getString(session['id'], 'session id');

  const brokenPatchResponse = await request({
    url: `${started.url}/patches/propose`,
    method: 'POST',
    body: {
      sessionId,
      planId: 'plan-zero-runtime-mvp-e2e-flow-test',
      summary: 'Introduce a broken change so sandbox recovery can be validated.',
      riskLevel: 'low',
      candidateFiles: [
        {
          path: 'src/value.ts',
          existsKnown: true,
          reason: 'Target file for MVP E2E sandbox recovery flow.',
        },
      ],
      verifyCommands: [
        {
          command: 'npm',
          args: ['run', 'typecheck'],
          reason: 'Validate TypeScript before real apply.',
          requiresApproval: true,
        },
      ],
    },
  });

  assert(brokenPatchResponse.status === 'ok', JSON.stringify(brokenPatchResponse, null, 2));

  const brokenProposal = getObject(brokenPatchResponse['proposal'], 'broken proposal');

  brokenProposal['files'] = [
    {
      path: 'src/value.ts',
      operation: 'modify',
      beforeHash: hashContent(originalContent),
      content: 'export const value: number = "broken";\n',
      reason: 'Broken proposal intentionally fails sandbox typecheck.',
      changesSummary: ['Assigns a string to a number.'],
      riskLevel: 'low',
      userSelectable: true,
    },
  ];

  const brokenDiffResponse = await request({
    url: `${started.url}/patches/diff`,
    method: 'POST',
    body: {
      proposal: brokenProposal,
    },
  });

  assert(brokenDiffResponse.status === 'ok', JSON.stringify(brokenDiffResponse, null, 2));

  const brokenDiff = getObject(brokenDiffResponse['diff'], 'broken diff');

  await approvePatch({
    baseUrl: started.url,
    sessionId,
    projectRoot,
    proposal: brokenProposal,
    diff: brokenDiff,
  });

  const failedSandboxResponse = await request({
    url: `${started.url}/patches/sandbox/verify`,
    method: 'POST',
    body: {
      proposal: brokenProposal,
    },
  });

  assert(failedSandboxResponse.status === 'ok', JSON.stringify(failedSandboxResponse, null, 2));

  const failedSandbox = getObject(failedSandboxResponse['sandbox'], 'failed sandbox');

  assert(failedSandbox['status'] === 'failed', JSON.stringify(failedSandboxResponse, null, 2));

  const recoveryResponse = await request({
    url: `${started.url}/patches/recovery/prepare`,
    method: 'POST',
    body: {
      originalObjective: 'Safely update a TypeScript value through sandbox recovery.',
      proposal: brokenProposal,
      sandboxResult: failedSandbox,
      maxAttempts: 2,
    },
  });

  assert(recoveryResponse.status === 'ok', JSON.stringify(recoveryResponse, null, 2));

  const recovery = getObject(recoveryResponse['recovery'], 'patch recovery');

  assert(recovery['status'] === 'repair_prompt_ready', 'Expected recovery prompt to be ready.');

  const repairedPatchResponse = await request({
    url: `${started.url}/patches/propose`,
    method: 'POST',
    body: {
      sessionId,
      planId: 'plan-zero-runtime-mvp-e2e-flow-test',
      summary: 'Repair the broken value patch after sandbox failure.',
      riskLevel: 'low',
      candidateFiles: [
        {
          path: 'src/value.ts',
          existsKnown: true,
          reason: 'Target file for repaired MVP E2E patch.',
        },
      ],
      verifyCommands: [
        {
          command: 'npm',
          args: ['run', 'typecheck'],
          reason: 'Validate TypeScript before real apply.',
          requiresApproval: true,
        },
      ],
    },
  });

  assert(repairedPatchResponse.status === 'ok', JSON.stringify(repairedPatchResponse, null, 2));

  const repairedProposal = getObject(repairedPatchResponse['proposal'], 'repaired proposal');

  repairedProposal['files'] = [
    {
      path: 'src/value.ts',
      operation: 'modify',
      beforeHash: hashContent(originalContent),
      content: 'export const value: number = 2;\n',
      reason: 'Repaired proposal passes TypeScript sandbox verification.',
      changesSummary: ['Assigns a number to a number.'],
      riskLevel: 'low',
      userSelectable: true,
    },
  ];

  const repairedDiffResponse = await request({
    url: `${started.url}/patches/diff`,
    method: 'POST',
    body: {
      proposal: repairedProposal,
    },
  });

  assert(repairedDiffResponse.status === 'ok', JSON.stringify(repairedDiffResponse, null, 2));

  const repairedDiff = getObject(repairedDiffResponse['diff'], 'repaired diff');

  await approvePatch({
    baseUrl: started.url,
    sessionId,
    projectRoot,
    proposal: repairedProposal,
    diff: repairedDiff,
  });

  const staleSandboxApplyResponse = await request({
    url: `${started.url}/patches/apply`,
    method: 'POST',
    body: {
      proposal: repairedProposal,
      diff: repairedDiff,
      sandboxResult: failedSandbox,
      applyConfirmed: true,
      allowMissingRepository: false,
      allowDirtyWorkingTree: false,
      backupEnabled: true,
    },
  });

  assert(
    staleSandboxApplyResponse.status === 'error',
    'Expected failed/stale sandbox to be rejected for repaired apply.',
  );

  const passedSandboxResponse = await request({
    url: `${started.url}/patches/sandbox/verify`,
    method: 'POST',
    body: {
      proposal: repairedProposal,
    },
  });

  assert(passedSandboxResponse.status === 'ok', JSON.stringify(passedSandboxResponse, null, 2));

  const passedSandbox = getObject(passedSandboxResponse['sandbox'], 'passed sandbox');

  assert(passedSandbox['status'] === 'passed', JSON.stringify(passedSandboxResponse, null, 2));

  const applyResponse = await request({
    url: `${started.url}/patches/apply`,
    method: 'POST',
    body: {
      proposal: repairedProposal,
      diff: repairedDiff,
      sandboxResult: passedSandbox,
      applyConfirmed: true,
      allowMissingRepository: false,
      allowDirtyWorkingTree: false,
      backupEnabled: true,
    },
  });

  assert(applyResponse.status === 'ok', JSON.stringify(applyResponse, null, 2));

  const apply = getObject(applyResponse['apply'], 'apply');

  assert(apply['status'] === 'applied', 'Expected repaired apply to be applied.');

  const finalContent = await readFile(path.join(projectRoot, 'src', 'value.ts'), 'utf8');

  assert(finalContent === 'export const value: number = 2;\n', 'Expected repaired content.');

  const reportResponse = await request({
    url: `${started.url}/reports/export`,
    method: 'POST',
    body: {
      sessionId,
    },
  });

  assert(reportResponse.status === 'ok', JSON.stringify(reportResponse, null, 2));

  const reportFiles = getObject(reportResponse['files'], 'report files');

  assert(typeof reportFiles['markdownPath'] === 'string', 'Expected markdown report path.');
  assert(typeof reportFiles['jsonPath'] === 'string', 'Expected json report path.');

  const artifactResponse = await request({
    url: `${started.url}/artifacts`,
    method: 'GET',
  });

  assert(artifactResponse.status === 'ok', JSON.stringify(artifactResponse, null, 2));

  const artifactIndex = getObject(artifactResponse['artifactIndex'], 'artifact index');
  const artifacts = getArray(artifactIndex['artifacts'], 'runtime artifacts');

  const normalizedSessionId = sessionId.toLowerCase();

  const hasSandboxArtifact = artifacts
    .map((item) => getObject(item, 'artifact'))
    .some(
      (artifact) =>
        artifact['kind'] === 'sandbox_result' &&
        typeof artifact['sessionId'] === 'string' &&
        artifact['sessionId'].toLowerCase() === normalizedSessionId,
    );

  const hasRecoveryArtifact = artifacts
    .map((item) => getObject(item, 'artifact'))
    .some(
      (artifact) =>
        artifact['kind'] === 'patch_recovery' &&
        typeof artifact['sessionId'] === 'string' &&
        artifact['sessionId'].toLowerCase() === normalizedSessionId,
    );
  assert(hasSandboxArtifact, 'Expected runtime artifact store to index sandbox result.');
  assert(hasRecoveryArtifact, 'Expected runtime artifact store to index patch recovery.');

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'zero-runtime-mvp-e2e-flow-test',
        sessionId,
        brokenProposalId: brokenProposal['id'],
        failedSandboxStatus: failedSandbox['status'],
        recoveryStatus: recovery['status'],
        repairedProposalId: repairedProposal['id'],
        staleSandboxApplyStatus: staleSandboxApplyResponse.status,
        passedSandboxStatus: passedSandbox['status'],
        applyStatus: apply['status'],
        finalContent,
        reportMarkdownPath: reportFiles['markdownPath'],
        reportJsonPath: reportFiles['jsonPath'],
        hasSandboxArtifact,
        hasRecoveryArtifact,
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
