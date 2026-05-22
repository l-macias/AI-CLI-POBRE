import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RuntimeApiServer } from '../api/RuntimeApiServer.js';

interface ApiResponse {
  status?: string;
  [key: string]: unknown;
}

function assert(condition: boolean, message: string): void {
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

const testRoot = path.resolve('.runtime/real-platform-workflow-test');
const projectRoot = path.join(testRoot, 'project');

await rm(testRoot, {
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
  JSON.stringify(
    {
      name: 'real-platform-workflow-fixture',
      type: 'module',
      scripts: {
        build: 'echo build-ok',
        lint: 'echo lint-ok',
        typecheck: 'echo typecheck-ok',
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
  path.join(projectRoot, 'src', 'routes', 'profileRoutes.ts'),
  [
    "import { Router } from 'express';",
    "import { getProfile } from '../controllers/profileController';",
    'const router = Router();',
    "router.get('/api/profile', getProfile);",
    'export default router;',
    '',
  ].join('\n'),
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'controllers', 'profileController.ts'),
  'export function getProfile() { return true; }\n',
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'api', 'profileApi.ts'),
  "export async function getProfile() { return fetch('/api/profile'); }\n",
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'src', 'components', 'ProfileCard.tsx'),
  [
    "import { getProfile } from '../api/profileApi';",
    '',
    'export function ProfileCard() {',
    '  void getProfile();',
    '  return <section>Profile</section>;',
    '}',
    '',
  ].join('\n'),
  'utf8',
);

await writeFile(
  path.join(projectRoot, 'prisma', 'schema.prisma'),
  'datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\n',
  'utf8',
);

await writeFile(path.join(projectRoot, '.env'), 'DATABASE_URL=secret\n', 'utf8');

const server = new RuntimeApiServer({
  config: {
    port: 17883,
  },
});

const started = await server.start();

try {
  const health = await request({
    url: `${started.url}/health`,
  });

  assert(health.status === 'ok', 'health should return ok');

  const projectScanResponse = await request({
    url: `${started.url}/projects/scan`,
    method: 'POST',
    body: {
      rootPath: projectRoot,
      name: 'real-platform-workflow-fixture',
      workingMode: 'local_snapshot',
      gitRequired: false,
    },
  });

  assert(projectScanResponse.status === 'ok', 'project scan should return ok');

  const sessionResponse = await request({
    url: `${started.url}/sessions`,
    method: 'POST',
    body: {
      projectRoot,
      projectName: 'real-platform-workflow-fixture',
      goal: 'Audit this MERN/PERN-style project and prepare a safe workflow without applying patches.',
    },
  });

  assert(sessionResponse.status === 'ok', 'session create should return ok');

  const session = getObject(sessionResponse['session'], 'session');
  const sessionId = getString(session['id'], 'session id');

  const workflowResponse = await request({
    url: `${started.url}/workflow/prepare`,
    method: 'POST',
    body: {
      sessionId,
      projectRoot,
      projectName: 'real-platform-workflow-fixture',
      objective:
        'Audit this MERN/PERN-style project and prepare a safe workflow without applying patches.',
      workspaceMode: 'local_snapshot',
      createDefaultTasks: true,
    },
  });

  assert(workflowResponse.status === 'ok', 'workflow prepare should return ok');

  const workflow = getObject(workflowResponse['workflow'], 'workflow');
  const stack = getObject(workflow['stack'], 'workflow stack');
  const stackItems = getArray(stack['stack'], 'stack items');

  assert(stackItems.includes('react'), 'workflow should detect React');
  assert(stackItems.includes('express'), 'workflow should detect Express');
  assert(
    stackItems.includes('postgres') || stackItems.includes('postgresql'),
    'workflow should detect PostgreSQL',
  );
  assert(stackItems.includes('prisma'), 'workflow should detect Prisma');

  const apiRoutes = getObject(workflow['apiRoutes'], 'api routes');
  const routes = getArray(apiRoutes['routes'], 'routes');

  assert(routes.length > 0, 'workflow should map backend API routes');

  const frontendBackend = getObject(workflow['frontendBackend'], 'frontend backend links');
  const links = getArray(frontendBackend['links'], 'frontend backend links array');

  assert(links.length > 0, 'workflow should link frontend API usage to backend routes');

  const tasksResponse = await request({
    url: `${started.url}/sessions/${sessionId}/tasks`,
  });

  assert(tasksResponse.status === 'ok', 'tasks should return ok');

  const taskState = getObject(tasksResponse['tasks'], 'task state');
  const tasks = getArray(taskState['tasks'], 'tasks');

  assert(tasks.length >= 6, 'workflow should create default tasks');

  const questionsResponse = await request({
    url: `${started.url}/questions`,
    method: 'POST',
    body: {
      sessionId,
      projectRoot,
      projectName: 'real-platform-workflow-fixture',
      objective:
        'Audit this MERN/PERN-style project and prepare a safe workflow without applying patches.',
      stack: stackItems,
      workspaceMode: 'local_snapshot',
    },
  });

  assert(questionsResponse.status === 'ok', 'questions should return ok');

  const questionsResult = getObject(questionsResponse['questions'], 'questions result');
  const questions = getArray(questionsResult['questions'], 'questions');

  if (questions.length > 0) {
    const firstQuestion = getObject(questions[0], 'first question');
    const questionId = getString(firstQuestion['id'], 'question id');

    assert(questionId.length > 0, 'first generated question should include an id');
  }

  const snapshotResponse = await request({
    url: `${started.url}/snapshots`,
    method: 'POST',
    body: {
      projectRoot,
      sessionId,
      targetFiles: [
        'package.json',
        'tsconfig.json',
        'src/routes/profileRoutes.ts',
        'src/controllers/profileController.ts',
        'src/api/profileApi.ts',
        'src/components/ProfileCard.tsx',
        'prisma/schema.prisma',
      ],
    },
  });

  assert(snapshotResponse.status === 'ok', 'snapshot create should return ok');

  const snapshot = getObject(snapshotResponse['snapshot'], 'snapshot');
  const snapshotId = getString(snapshot['snapshotId'], 'snapshot id');

  assert(snapshotId.length > 0, 'snapshot id should be present');

  const verifyResponse = await request({
    url: `${started.url}/verify/run`,
    method: 'POST',
    body: {
      sessionId,
      cwd: projectRoot,
      command: 'npm',
      args: ['run', 'typecheck'],
      approved: true,
    },
  });

  assert(verifyResponse.status === 'ok', 'verify run should return ok');

  const verify = getObject(verifyResponse['verify'], 'verify result');

  assert(verify['status'] === 'executed', 'verify should be executed');
  assert(verify['exitCode'] === 0, 'verify should exit with code 0');

  const reportResponse = await request({
    url: `${started.url}/reports/export`,
    method: 'POST',
    body: {
      sessionId,
    },
  });

  assert(reportResponse.status === 'ok', 'report export should return ok');

  const files = getObject(reportResponse['files'], 'report files');
  const markdownPath = getString(files['markdownPath'], 'markdown report path');
  const jsonPath = getString(files['jsonPath'], 'json report path');

  assert(markdownPath.endsWith('.md'), 'markdown report should be exported');
  assert(jsonPath.endsWith('.json'), 'json report should be exported');

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'real-platform-workflow-test',
        sessionId,
        projectRoot,
        detectedStack: stackItems,
        routes: routes.length,
        frontendBackendLinks: links.length,
        tasks: tasks.length,
        questions: questions.length,
        snapshotId,
        verifyStatus: verify['status'],
        verifyExitCode: verify['exitCode'],
        markdownPath,
        jsonPath,
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
