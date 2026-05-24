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

  await mkdir(path.join(projectRoot, 'src', 'components'), {
    recursive: true,
  });

  await writeFile(
    path.join(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'controlled-patch-workflow-e2e-fixture',
        type: 'module',
        scripts: {
          typecheck: 'tsc --noEmit',
        },
        dependencies: {
          react: '^19.0.0',
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

  await writeFile(
    path.join(projectRoot, 'tsconfig.json'),
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

  await writeFile(
    path.join(projectRoot, 'src', 'components', 'ProfileCard.tsx'),
    'export function ProfileCard() { return <section>Profile</section>; }\n',
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

const testRoot = path.resolve('.runtime/controlled-patch-workflow-e2e-test');
const projectRoot = path.join(testRoot, 'project');

await resetGitFixture(projectRoot);

const server = new RuntimeApiServer({
  config: {
    port: 17889,
  },
});

const started = await server.start();

try {
  const sessionResponse = await request({
    url: `${started.url}/sessions`,
    method: 'POST',
    body: {
      projectRoot,
      projectName: 'controlled-patch-workflow-e2e-fixture',
      goal: 'Improve the React profile component safely.',
    },
  });

  assert(sessionResponse.status === 'ok', JSON.stringify(sessionResponse, null, 2));

  const session = getObject(sessionResponse['session'], 'session');
  const sessionId = getString(session['id'], 'session id');

  const planResponse = await request({
    url: `${started.url}/plans/generate`,
    method: 'POST',
    body: {
      sessionId,
      instruction: 'Improve the React profile component safely without applying changes yet.',
      workspaceMode: 'local_snapshot',
      useProvider: false,
      stack: ['react', 'typescript'],
      knownFiles: ['src/components/ProfileCard.tsx'],
    },
  });

  assert(planResponse.status === 'ok', JSON.stringify(planResponse, null, 2));

  const plan = getObject(planResponse['plan'], 'plan');
  const planScope = getObject(plan['scope'], 'plan scope');
  const candidateFiles = getArray(planScope['candidateFiles'], 'candidate files');

  assert(plan['status'] === 'validated', 'runtime plan should be validated');
  assert(candidateFiles.length === 1, 'runtime plan should include one candidate file');

  const patchResponse = await request({
    url: `${started.url}/patches/propose`,
    method: 'POST',
    body: {
      sessionId,
      planId: plan['id'],
      summary: plan['objective'],
      riskLevel: plan['riskLevel'],
      candidateFiles,
      verifyCommands: plan['verifyCommands'],
    },
  });

  assert(patchResponse.status === 'ok', JSON.stringify(patchResponse, null, 2));

  const proposal = getObject(patchResponse['proposal'], 'proposal');

  assert(proposal['status'] === 'validated', 'patch proposal should be validated');

  const diffResponse = await request({
    url: `${started.url}/patches/diff`,
    method: 'POST',
    body: {
      proposal,
    },
  });

  assert(diffResponse.status === 'ok', JSON.stringify(diffResponse, null, 2));

  const diff = getObject(diffResponse['diff'], 'diff');
  const diffSummary = getObject(diff['summary'], 'diff summary');

  assert(diff['safeToPreview'] === true, 'diff should be safe to preview');
  assert(diffSummary['filesChanged'] === 1, 'diff should include one changed file');

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
      backupEnabled: true,
    },
  });

  assert(dryRunResponse.status === 'ok', JSON.stringify(dryRunResponse, null, 2));

  const dryRun = getObject(dryRunResponse['apply'], 'dry run apply');

  assert(dryRun['status'] === 'dry_run', 'dry run should be successful');

  const beforeApplyContent = await readFile(
    path.join(projectRoot, 'src', 'components', 'ProfileCard.tsx'),
    'utf8',
  );

  assert(
    beforeApplyContent === 'export function ProfileCard() { return <section>Profile</section>; }\n',
    'dry run must not write files',
  );

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
  const operationResults = getArray(apply['operationResults'], 'operation results');

  assert(apply['status'] === 'applied', 'controlled apply should succeed');
  assert(operationResults.length === 1, 'apply should include one operation result');

  const afterApplyContent = await readFile(
    path.join(projectRoot, 'src', 'components', 'ProfileCard.tsx'),
    'utf8',
  );

  assert(
    afterApplyContent.includes('Runtime patch proposal placeholder'),
    'controlled apply should write proposed patch content',
  );

  const reportResponse = await request({
    url: `${started.url}/reports/export`,
    method: 'POST',
    body: {
      sessionId,
    },
  });

  assert(reportResponse.status === 'ok', JSON.stringify(reportResponse, null, 2));

  const reportFiles = getObject(reportResponse['files'], 'report files');

  assert(typeof reportFiles['markdownPath'] === 'string', 'markdown report should be exported');
  assert(typeof reportFiles['jsonPath'] === 'string', 'json report should be exported');

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'controlled-patch-workflow-e2e-test',
        sessionId,
        planId: plan['id'],
        proposalId: proposal['id'],
        diffId: diff['id'],
        dryRunStatus: dryRun['status'],
        applyStatus: apply['status'],
        reportMarkdownPath: reportFiles['markdownPath'],
        reportJsonPath: reportFiles['jsonPath'],
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
