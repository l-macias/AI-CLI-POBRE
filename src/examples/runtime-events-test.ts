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

async function readUntilEvent(input: {
  url: string;
  expectedEvent: string;
  signal: AbortSignal;
}): Promise<string> {
  const response = await fetch(input.url, {
    signal: input.signal,
  });

  if (!response.body) {
    throw new Error('SSE response body is missing.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const chunk = await reader.read();

    if (chunk.done) {
      return buffer;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    buffer += decoder.decode(chunk.value, {
      stream: true,
    });

    if (buffer.includes(`event: ${input.expectedEvent}`)) {
      await reader.cancel();
      return buffer;
    }
  }
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

const testRoot = path.resolve('.runtime/runtime-events-test');
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
      name: 'runtime-events-project',
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
    port: 17874,
  },
});

const started = await server.start();
const abortController = new AbortController();

try {
  const eventPromise = readUntilEvent({
    url: `${started.url}/api/events`,
    expectedEvent: 'session.started',
    signal: abortController.signal,
  });

  const sessionResponse = await request({
    url: `${started.url}/api/sessions`,
    method: 'POST',
    body: {
      projectRoot,
      projectName: 'runtime-events-project',
      goal: 'Test realtime events.',
    },
  });

  assert(sessionResponse.status === 'ok', 'session create should return ok');

  const eventPayload = await eventPromise;

  assert(
    eventPayload.includes('event: session.started'),
    'global SSE stream should receive session.started',
  );

  const session = getObject(sessionResponse['session'], 'session');
  const sessionId = getString(session['id'], 'session id');

  const sessionEventAbortController = new AbortController();

  const sessionEventPromise = readUntilEvent({
    url: `${started.url}/api/sessions/${encodeURIComponent(sessionId)}/events`,
    expectedEvent: 'session.command',
    signal: sessionEventAbortController.signal,
  });

  const commandResponse = await request({
    url: `${started.url}/api/sessions/${encodeURIComponent(sessionId)}/commands`,
    method: 'POST',
    body: {
      input: '/plan',
    },
  });

  assert(commandResponse.status === 'ok', 'command route should return ok');

  const sessionEventPayload = await sessionEventPromise;

  assert(
    sessionEventPayload.includes('event: session.command'),
    'session SSE stream should receive session.command',
  );

  const projectEventAbortController = new AbortController();

  const projectEventPromise = readUntilEvent({
    url: `${started.url}/api/events`,
    expectedEvent: 'project.scanned',
    signal: projectEventAbortController.signal,
  });

  const projectResponse = await request({
    url: `${started.url}/api/projects/scan`,
    method: 'POST',
    body: {
      rootPath: projectRoot,
      name: 'runtime-events-project',
    },
  });

  assert(projectResponse.status === 'ok', 'project scan should return ok');

  const projectEventPayload = await projectEventPromise;

  assert(
    projectEventPayload.includes('event: project.scanned'),
    'global SSE stream should receive project.scanned',
  );

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'runtime-events-test',
        url: started.url,
        sessionId,
        events: ['session.started', 'session.command', 'project.scanned'],
      },
      null,
      2,
    ),
  );
} finally {
  abortController.abort();
  await server.stop();
}
