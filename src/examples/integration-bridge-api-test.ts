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

const testRoot = path.resolve('.runtime/integration-bridge-api-test');
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

await writeFile(
  path.join(projectRoot, 'package.json'),
  JSON.stringify(
    {
      type: 'module',
      scripts: {
        build: 'echo build-ok',
        lint: 'echo lint-ok',
        typecheck: 'echo typecheck-ok',
      },
      dependencies: {
        express: '^4.0.0',
        react: '^19.0.0',
        vite: '^6.0.0',
        '@prisma/client': '^5.0.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
        prisma: '^5.0.0',
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

const server = new RuntimeApiServer({
  config: {
    port: 17875,
  },
});

const started = await server.start();

try {
  const sessionResponse = await request({
    url: `${started.url}/api/sessions`,
    method: 'POST',
    body: {
      projectRoot,
      projectName: 'integration-project',
      goal: 'Improve frontend and backend safely',
    },
  });

  assert(sessionResponse.status === 'ok', 'session should start');

  const session = getObject(sessionResponse['session'], 'session');
  const sessionId = session['id'];

  if (typeof sessionId !== 'string') {
    throw new Error('session id should be string');
  }

  const questionsResponse = await request({
    url: `${started.url}/api/questions`,
    method: 'POST',
    body: {
      sessionId,
      stack: ['react', 'express', 'typescript', 'pern', 'prisma'],
    },
  });

  assert(questionsResponse.status === 'ok', 'questions should return ok');

  const taskResponse = await request({
    url: `${started.url}/api/sessions/${encodeURIComponent(sessionId)}/tasks`,
    method: 'POST',
    body: {
      title: 'Inspect project',
      description: 'Inspect stack and API routes.',
      kind: 'inspect',
    },
  });

  assert(taskResponse.status === 'ok', 'task create should return ok');

  const tasksResponse = await request({
    url: `${started.url}/api/sessions/${encodeURIComponent(sessionId)}/tasks`,
  });

  assert(tasksResponse.status === 'ok', 'tasks list should return ok');

  const verifyCommandsResponse = await request({
    url: `${started.url}/api/verify/commands`,
  });

  assert(verifyCommandsResponse.status === 'ok', 'verify commands should return ok');

  const verifyScriptsResponse = await request({
    url: `${started.url}/api/verify/scripts`,
    method: 'POST',
    body: {
      projectRoot,
    },
  });

  assert(verifyScriptsResponse.status === 'ok', 'verify scripts should return ok');

  const verifyRunResponse = await request({
    url: `${started.url}/api/verify/run`,
    method: 'POST',
    body: {
      command: 'npm',
      args: ['run', 'build'],
      cwd: projectRoot,
      approved: true,
    },
  });

  assert(verifyRunResponse.status === 'ok', 'verify run should return ok');

  const stackResponse = await request({
    url: `${started.url}/api/intelligence/stack`,
    method: 'POST',
    body: {
      projectRoot,
    },
  });

  assert(stackResponse.status === 'ok', 'stack intelligence should return ok');

  const routesResponse = await request({
    url: `${started.url}/api/intelligence/api-routes`,
    method: 'POST',
    body: {
      projectRoot,
    },
  });

  assert(routesResponse.status === 'ok', 'api route map should return ok');

  const linksResponse = await request({
    url: `${started.url}/api/intelligence/frontend-backend`,
    method: 'POST',
    body: {
      projectRoot,
    },
  });

  assert(linksResponse.status === 'ok', 'frontend/backend links should return ok');

  const reportResponse = await request({
    url: `${started.url}/api/reports/export`,
    method: 'POST',
    body: {
      sessionId,
    },
  });

  assert(reportResponse.status === 'ok', 'report export should return ok');

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'integration-bridge-api-test',
        url: started.url,
        sessionId,
        endpoints: [
          '/api/questions',
          '/api/sessions/:id/tasks',
          '/api/verify/commands',
          '/api/verify/scripts',
          '/api/verify/run',
          '/api/intelligence/stack',
          '/api/intelligence/api-routes',
          '/api/intelligence/frontend-backend',
          '/api/reports/export',
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await server.stop();
}
