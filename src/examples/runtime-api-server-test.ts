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

function getString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} should be a string`);
  }

  return value;
}

const testRoot = path.resolve('.runtime/runtime-api-server-test');
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
      name: 'api-test-project',
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

await writeFile(path.join(projectRoot, 'src', 'index.ts'), 'export const value = 1;\n', 'utf8');

const server = new RuntimeApiServer({
  config: {
    port: 17872,
  },
});

const started = await server.start();

try {
  const health = await request({
    url: `${started.url}/health`,
  });

  assert(health.status === 'ok', 'health should return ok');

  const sessionResponse = await request({
    url: `${started.url}/sessions`,
    method: 'POST',
    body: {
      projectRoot,
      projectName: 'api-test-project',
      goal: 'Test local runtime API.',
    },
  });

  assert(sessionResponse.status === 'ok', 'session create should return ok');

  const session = getObject(sessionResponse['session'], 'session');
  const sessionId = getString(session['id'], 'session id');

  const commandResponse = await request({
    url: `${started.url}/sessions/${sessionId}/commands`,
    method: 'POST',
    body: {
      input: '/plan',
    },
  });

  assert(commandResponse.status === 'ok', 'command route should return ok');

  const projectResponse = await request({
    url: `${started.url}/projects/scan`,
    method: 'POST',
    body: {
      rootPath: projectRoot,
      name: 'api-test-project',
      workingMode: 'local_snapshot',
    },
  });

  assert(projectResponse.status === 'ok', 'project scan should return ok');

  const workspaceResponse = await request({
    url: `${started.url}/workspace/resolve`,
    method: 'POST',
    body: {
      projectRoot,
      mode: 'local_snapshot',
    },
  });

  assert(workspaceResponse.status === 'ok', 'workspace resolve should return ok');

  const snapshotResponse = await request({
    url: `${started.url}/snapshots`,
    method: 'POST',
    body: {
      projectRoot,
      sessionId,
      targetFiles: ['src/index.ts'],
    },
  });

  assert(snapshotResponse.status === 'ok', 'snapshot create should return ok');

  const snapshot = getObject(snapshotResponse['snapshot'], 'snapshot');
  const snapshotRoot = getString(snapshot['snapshotRoot'], 'snapshot root');

  await writeFile(path.join(projectRoot, 'src', 'index.ts'), 'export const value = 2;\n', 'utf8');

  const afterResponse = await request({
    url: `${started.url}/snapshots/after`,
    method: 'POST',
    body: {
      snapshotRoot,
    },
  });

  assert(afterResponse.status === 'ok', 'snapshot after should return ok');

  const restoreResponse = await request({
    url: `${started.url}/snapshots/restore`,
    method: 'POST',
    body: {
      snapshotRoot,
    },
  });

  assert(restoreResponse.status === 'ok', 'snapshot restore should return ok');

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'runtime-api-server-test',
        url: started.url,
        sessionId,
        projectRoot,
      },
      null,
      2,
    ),
  );
} finally {
  await server.stop();
}
