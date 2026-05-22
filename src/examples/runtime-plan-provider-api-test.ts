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
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} should be a non-empty string`);
  }

  return value;
}

const testRoot = path.resolve('.runtime/runtime-plan-provider-api-test');
const projectRoot = path.join(testRoot, 'project');

await rm(testRoot, {
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
      name: 'runtime-plan-provider-api-fixture',
      type: 'module',
      scripts: {
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        react: '^19.0.0',
        express: '^4.0.0',
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
  path.join(projectRoot, 'src', 'components', 'ProfileCard.tsx'),
  'export function ProfileCard() { return <section>Profile</section>; }\n',
  'utf8',
);

const server = new RuntimeApiServer({
  config: {
    port: 17885,
  },
});

const started = await server.start();

try {
  const sessionResponse = await request({
    url: `${started.url}/sessions`,
    method: 'POST',
    body: {
      projectRoot,
      projectName: 'runtime-plan-provider-api-fixture',
      goal: 'Improve profile UI safely.',
    },
  });

  assert(sessionResponse.status === 'ok', 'session create should return ok');

  const session = getObject(sessionResponse['session'], 'session');
  const sessionId = getString(session['id'], 'session id');

  const deterministicResponse = await request({
    url: `${started.url}/plans/generate`,
    method: 'POST',
    body: {
      sessionId,
      instruction: 'Improve the React profile component without applying changes yet.',
      workspaceMode: 'local_snapshot',
      stack: ['react', 'typescript'],
      knownFiles: ['src/components/ProfileCard.tsx'],
      useProvider: false,
    },
  });

  assert(deterministicResponse.status === 'ok', JSON.stringify(deterministicResponse, null, 2));
  assert(deterministicResponse['source'] === 'runtime', 'expected runtime source');

  const fallbackResponse = await request({
    url: `${started.url}/plans/generate`,
    method: 'POST',
    body: {
      sessionId,
      instruction: 'Improve the React profile component without applying changes yet.',
      workspaceMode: 'local_snapshot',
      stack: ['react', 'typescript'],
      knownFiles: ['src/components/ProfileCard.tsx'],
      useProvider: true,
      model: 'poolside/laguna-xs.2:free',
    },
  });

  assert(fallbackResponse.status === 'ok', JSON.stringify(fallbackResponse, null, 2));
  assert(fallbackResponse['source'] === 'fallback', 'expected fallback source without API key');

  const runtimePlan = getObject(deterministicResponse['plan'], 'runtime plan');
  const fallbackPlan = getObject(fallbackResponse['plan'], 'fallback plan');

  assert(runtimePlan['status'] === 'validated', 'runtime plan should be validated');
  assert(fallbackPlan['status'] === 'validated', 'fallback plan should be validated');
  assert(typeof fallbackResponse['fallbackReason'] === 'string', 'fallback reason should exist');

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'runtime-plan-provider-api-test',
        sessionId,
        runtimeSource: deterministicResponse['source'],
        fallbackSource: fallbackResponse['source'],
        fallbackReason: fallbackResponse['fallbackReason'],
        runtimePlanId: runtimePlan['id'],
        fallbackPlanId: fallbackPlan['id'],
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
