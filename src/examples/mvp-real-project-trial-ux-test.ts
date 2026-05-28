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

interface TrialStep {
  name: string;
  status: 'passed';
  detail: string;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(input: {
  baseUrl: string;
  path: string;
  method?: 'GET' | 'POST' | undefined;
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

  const response = await fetch(`${input.baseUrl}${input.path}`, init);
  const parsed = (await response.json()) as ApiResponse;

  return parsed;
}

async function expectOk(input: {
  baseUrl: string;
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  name: string;
}): Promise<ApiResponse> {
  const response = await request({
    baseUrl: input.baseUrl,
    path: input.path,
    method: input.method,
    body: input.body,
  });

  assert(
    response.status === 'ok',
    `${input.name} should return ok. Received: ${JSON.stringify(response, null, 2)}`,
  );

  return response;
}

function getObject(value: unknown, label: string): Record<string, unknown> {
  assert(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    `${label} should be an object.`,
  );

  return value as Record<string, unknown>;
}

function getArray(value: unknown, label: string): unknown[] {
  assert(Array.isArray(value), `${label} should be an array.`);

  return value;
}

function getString(value: unknown, label: string): string {
  assert(typeof value === 'string' && value.trim().length > 0, `${label} should be a string.`);

  return value;
}

async function resetGitFixture(projectRoot: string): Promise<void> {
  await rm(projectRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(path.join(projectRoot, 'src', 'routes'), {
    recursive: true,
  });

  await mkdir(path.join(projectRoot, 'src', 'controllers'), {
    recursive: true,
  });

  await mkdir(path.join(projectRoot, 'src', 'api'), {
    recursive: true,
  });

  await mkdir(path.join(projectRoot, 'src', 'components'), {
    recursive: true,
  });

  await mkdir(path.join(projectRoot, 'prisma'), {
    recursive: true,
  });

  await writeFile(
    path.join(projectRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'mvp-real-project-trial-fixture',
        type: 'module',
        scripts: {
          build: 'node -e "process.exit(0)"',
          lint: 'node -e "process.exit(0)"',
          typecheck: 'node -e "process.exit(0)"',
        },
        dependencies: {
          '@prisma/client': '^5.0.0',
          express: '^4.0.0',
          pg: '^8.0.0',
          react: '^19.0.0',
          vite: '^6.0.0',
        },
        devDependencies: {
          prisma: '^5.0.0',
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
          jsx: 'react-jsx',
          noEmit: true,
        },
        include: ['src/**/*.ts', 'src/**/*.tsx'],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  await writeFile(
    path.join(projectRoot, 'src', 'routes', 'profileRoutes.ts'),
    [
      "import { Router } from 'express';",
      "import { getProfile } from '../controllers/profileController';",
      '',
      'const router = Router();',
      '',
      "router.get('/api/profile', getProfile);",
      '',
      'export default router;',
      '',
    ].join('\n'),
    'utf8',
  );

  await writeFile(
    path.join(projectRoot, 'src', 'controllers', 'profileController.ts'),
    [
      'export function getProfile() {',
      '  return {',
      "    id: 'profile-test',",
      "    name: 'Zero Runtime User',",
      '  };',
      '}',
      '',
    ].join('\n'),
    'utf8',
  );

  await writeFile(
    path.join(projectRoot, 'src', 'api', 'profileApi.ts'),
    ['export async function getProfile() {', "  return fetch('/api/profile');", '}', ''].join('\n'),
    'utf8',
  );

  await writeFile(
    path.join(projectRoot, 'src', 'components', 'ProfileCard.tsx'),
    [
      "import { getProfile } from '../api/profileApi';",
      '',
      'export function ProfileCard() {',
      '  void getProfile();',
      '',
      '  return <section>Profile</section>;',
      '}',
      '',
    ].join('\n'),
    'utf8',
  );

  await writeFile(
    path.join(projectRoot, 'prisma', 'schema.prisma'),
    ['datasource db {', '  provider = "postgresql"', '  url = env("DATABASE_URL")', '}', ''].join(
      '\n',
    ),
    'utf8',
  );

  await writeFile(path.join(projectRoot, '.env'), 'DATABASE_URL=secret\n', 'utf8');

  await execFileAsync('git', ['init', '-b', 'trial-branch'], {
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

  await execFileAsync('git', ['commit', '-m', 'initial trial fixture'], {
    cwd: projectRoot,
    windowsHide: true,
  });
}

function getArtifactIndex(response: ApiResponse): Record<string, unknown> {
  const value = response['artifactIndex'] ?? response['index'] ?? response['artifacts'];

  return getObject(value, 'artifact index');
}

const testRoot = path.resolve('.runtime/mvp-real-project-trial-ux-test');
const projectRoot = path.join(testRoot, 'project');
const originalProfileCardContent = [
  "import { getProfile } from '../api/profileApi';",
  '',
  'export function ProfileCard() {',
  '  void getProfile();',
  '',
  '  return <section>Profile</section>;',
  '}',
  '',
].join('\n');

await resetGitFixture(projectRoot);

const server = new RuntimeApiServer({
  config: {
    host: '127.0.0.1',
    port: 17911,
  },
});

const started = await server.start();
const steps: TrialStep[] = [];

try {
  const health = await expectOk({
    baseUrl: started.url,
    path: '/health',
    name: 'health',
  });

  assert(
    health['service'] === 'zero-runtime-api',
    'health should expose zero runtime API service.',
  );

  steps.push({
    name: 'health',
    status: 'passed',
    detail: 'Runtime API is reachable.',
  });

  const projectScan = await expectOk({
    baseUrl: started.url,
    path: '/projects/scan',
    method: 'POST',
    name: 'project-scan',
    body: {
      rootPath: projectRoot,
      name: 'mvp-real-project-trial-fixture',
      workingMode: 'local_snapshot',
      gitRequired: false,
    },
  });

  const project = getObject(projectScan['project'], 'project');
  const projectStack = getArray(project['stack'], 'project stack');

  assert(projectStack.includes('react'), 'project scan should detect React.');
  assert(projectStack.includes('express'), 'project scan should detect Express.');
  assert(
    projectStack.includes('postgresql') || projectStack.includes('postgres'),
    'project scan should detect PostgreSQL.',
  );
  assert(projectStack.includes('prisma'), 'project scan should detect Prisma.');

  steps.push({
    name: 'register-project',
    status: 'passed',
    detail: `Detected stack: ${projectStack.join(', ')}`,
  });

  const sessionResponse = await expectOk({
    baseUrl: started.url,
    path: '/sessions',
    method: 'POST',
    name: 'session-create',
    body: {
      projectRoot,
      projectName: 'mvp-real-project-trial-fixture',
      goal: 'Improve the profile UI safely without touching database, Prisma, migrations or secrets.',
    },
  });

  const session = getObject(sessionResponse['session'], 'session');
  const sessionId = getString(session['id'], 'session id');

  steps.push({
    name: 'create-session',
    status: 'passed',
    detail: sessionId,
  });

  const workflowResponse = await expectOk({
    baseUrl: started.url,
    path: '/workflow/prepare',
    method: 'POST',
    name: 'workflow-prepare',
    body: {
      sessionId,
      projectRoot,
      projectName: 'mvp-real-project-trial-fixture',
      objective:
        'Improve the profile UI safely without touching database, Prisma, migrations or secrets.',
      workspaceMode: 'local_snapshot',
      createDefaultTasks: true,
    },
  });

  const workflow = getObject(workflowResponse['workflow'], 'workflow');
  const workflowStack = getObject(workflow['stack'], 'workflow stack');
  const workflowStackItems = getArray(workflowStack['stack'], 'workflow stack items');
  const apiRoutes = getObject(workflow['apiRoutes'], 'api routes');
  const routes = getArray(apiRoutes['routes'], 'api routes list');
  const frontendBackend = getObject(workflow['frontendBackend'], 'frontend backend links');
  const frontendBackendLinks = getArray(frontendBackend['links'], 'frontend backend link list');
  const tasks = getObject(workflow['tasks'], 'workflow tasks');
  const taskList = getArray(tasks['tasks'], 'workflow task list');

  assert(workflowStackItems.includes('react'), 'workflow should detect React.');
  assert(workflowStackItems.includes('express'), 'workflow should detect Express.');
  assert(routes.length >= 1, 'workflow should map backend routes.');
  assert(frontendBackendLinks.length >= 1, 'workflow should link frontend usage to backend.');
  assert(taskList.length >= 6, 'workflow should create default tasks.');

  steps.push({
    name: 'prepare-workflow',
    status: 'passed',
    detail: `routes=${routes.length}, links=${frontendBackendLinks.length}, tasks=${taskList.length}`,
  });

  const planResponse = await expectOk({
    baseUrl: started.url,
    path: '/plans/generate',
    method: 'POST',
    name: 'plan-generate',
    body: {
      sessionId,
      instruction:
        'Improve the React ProfileCard copy safely. Do not touch database, Prisma, migrations, auth or secrets.',
      workspaceMode: 'local_snapshot',
      stack: ['react', 'typescript'],
      knownFiles: ['src/components/ProfileCard.tsx'],
      useProvider: false,
    },
  });

  const plan = getObject(planResponse['plan'], 'runtime plan');
  const planScope = getObject(plan['scope'], 'plan scope');
  const candidateFiles = getArray(planScope['candidateFiles'], 'plan candidate files');
  const verifyCommands = getArray(plan['verifyCommands'], 'plan verify commands');

  assert(plan['status'] === 'validated', 'plan should be validated.');
  assert(candidateFiles.length === 1, 'plan should target one candidate file.');
  assert(verifyCommands.length >= 1, 'plan should include verify commands.');

  steps.push({
    name: 'generate-plan',
    status: 'passed',
    detail: getString(plan['id'], 'plan id'),
  });

  const patchResponse = await expectOk({
    baseUrl: started.url,
    path: '/patches/propose',
    method: 'POST',
    name: 'patch-propose',
    body: {
      sessionId,
      planId: plan['id'],
      summary: plan['objective'],
      riskLevel: plan['riskLevel'],
      candidateFiles,
      verifyCommands,
    },
  });

  const proposal = getObject(patchResponse['proposal'], 'patch proposal');
  const proposalFiles = getArray(proposal['files'], 'proposal files');

  assert(proposal['status'] === 'validated', 'patch proposal should be validated.');
  assert(proposalFiles.length === 1, 'patch proposal should contain one file.');

  steps.push({
    name: 'generate-patch-proposal',
    status: 'passed',
    detail: getString(proposal['id'], 'proposal id'),
  });

  const diffResponse = await expectOk({
    baseUrl: started.url,
    path: '/patches/diff',
    method: 'POST',
    name: 'patch-diff',
    body: {
      proposal,
    },
  });

  const diff = getObject(diffResponse['diff'], 'patch diff');
  const diffSummary = getObject(diff['summary'], 'diff summary');

  assert(diff['safeToPreview'] === true, 'diff should be safe to preview.');
  assert(diffSummary['filesChanged'] === 1, 'diff should change one file.');

  steps.push({
    name: 'generate-diff',
    status: 'passed',
    detail: getString(diff['id'], 'diff id'),
  });

  const sandboxResponse = await expectOk({
    baseUrl: started.url,
    path: '/patches/sandbox/verify',
    method: 'POST',
    name: 'sandbox-verify',
    body: {
      proposal,
    },
  });

  const sandbox = getObject(sandboxResponse['sandbox'], 'patch sandbox');

  assert(
    sandbox['status'] === 'passed',
    `sandbox should pass for controlled trial. Received: ${JSON.stringify(sandbox, null, 2)}`,
  );

  steps.push({
    name: 'sandbox-verify',
    status: 'passed',
    detail: getString(sandbox['id'], 'sandbox id'),
  });

  const workflowStateResponse = await expectOk({
    baseUrl: started.url,
    path: '/workflow/state',
    method: 'POST',
    name: 'workflow-state',
    body: {
      artifactState: {
        sessionStarted: true,
        workflowPrepared: true,
        planValid: true,
        planRejected: false,
        patchProposalValid: true,
        patchProposalRejected: false,
        diffReady: true,
        diffBlocked: false,

        sandboxPassed: true,
        sandboxFailed: false,
        sandboxBlocked: false,

        recoveryAvailable: false,
        recoveryPrepared: false,
        recoveryMaxAttemptsReached: false,
        repairedProposalGenerated: false,

        snapshotAvailable: false,
        dryRunCompleted: false,
        applyApplied: false,
        applyBlocked: false,
        applyFailed: false,
        rollbackDryRunCompleted: false,
        rollbackCompleted: false,
        rollbackBlocked: false,
        rollbackFailed: false,
        verifyCompleted: true,
        reportExported: false,
        riskLevel: 'low',
      },
    },
  });

  const runtimeWorkflow = getObject(workflowStateResponse['workflow'], 'runtime workflow state');

  assert(
    typeof runtimeWorkflow['currentStepId'] === 'string',
    'workflow state should expose current step.',
  );

  steps.push({
    name: 'workflow-state',
    status: 'passed',
    detail: `currentStep=${String(runtimeWorkflow['currentStepId'])}`,
  });

  const reportResponse = await expectOk({
    baseUrl: started.url,
    path: '/reports/export',
    method: 'POST',
    name: 'report-export',
    body: {
      sessionId,
    },
  });

  const reportFiles = getObject(reportResponse['files'], 'report files');
  const markdownPath = getString(reportFiles['markdownPath'], 'markdown report path');
  const jsonPath = getString(reportFiles['jsonPath'], 'json report path');

  assert(markdownPath.endsWith('.md'), 'markdown report should be exported.');
  assert(jsonPath.endsWith('.json'), 'json report should be exported.');

  steps.push({
    name: 'export-report',
    status: 'passed',
    detail: markdownPath,
  });

  const artifactResponse = await expectOk({
    baseUrl: started.url,
    path: '/artifacts',
    name: 'artifact-index',
  });

  const artifactIndex = getArtifactIndex(artifactResponse);
  const artifacts = getArray(artifactIndex['artifacts'], 'runtime artifacts');

  const normalizedSessionId = sessionId.toLowerCase();

  const sessionArtifacts = artifacts
    .map((item) => getObject(item, 'artifact'))
    .filter(
      (artifact) =>
        typeof artifact['sessionId'] === 'string' &&
        artifact['sessionId'].toLowerCase() === normalizedSessionId,
    );

  assert(sessionArtifacts.length >= 1, 'artifact index should include trial session artifacts.');

  steps.push({
    name: 'list-artifacts',
    status: 'passed',
    detail: `sessionArtifacts=${sessionArtifacts.length}`,
  });

  const inventoryResponse = await expectOk({
    baseUrl: started.url,
    path: '/maintenance/inventory',
    name: 'maintenance-inventory',
  });

  const inventory = getObject(inventoryResponse['inventory'], 'runtime data inventory');
  const totals = getObject(inventory['totals'], 'inventory totals');

  assert(typeof totals['files'] === 'number', 'inventory should expose file totals.');

  steps.push({
    name: 'maintenance-inventory',
    status: 'passed',
    detail: `files=${String(totals['files'])}`,
  });

  const finalProfileCardContent = await readFile(
    path.join(projectRoot, 'src', 'components', 'ProfileCard.tsx'),
    'utf8',
  );

  assert(
    finalProfileCardContent === originalProfileCardContent,
    'trial UX test must not apply patch changes to the real project fixture.',
  );

  steps.push({
    name: 'no-real-apply',
    status: 'passed',
    detail: 'Project fixture remained unchanged after plan/diff/sandbox/report flow.',
  });

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'mvp-real-project-trial-ux-test',
        url: started.url,
        sessionId,
        projectRoot,
        steps,
        summary: {
          stack: workflowStackItems,
          routes: routes.length,
          frontendBackendLinks: frontendBackendLinks.length,
          tasks: taskList.length,
          planId: plan['id'],
          proposalId: proposal['id'],
          diffId: diff['id'],
          sandboxStatus: sandbox['status'],
          markdownPath,
          jsonPath,
          sessionArtifacts: sessionArtifacts.length,
          projectUnchanged: true,
        },
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
