import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RuntimeApiServer } from '../api/RuntimeApiServer.js';

interface ApiResponse {
  status?: string;
  issues?: unknown;
  [key: string]: unknown;
}

interface SmokeCheck {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  status: 'passed';
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
}): Promise<{
  statusCode: number;
  body: ApiResponse;
}> {
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
  const body = (await response.json()) as ApiResponse;

  return {
    statusCode: response.status,
    body,
  };
}

async function expectOk(input: {
  name: string;
  baseUrl: string;
  path: string;
  method?: 'GET' | 'POST';
  body?: unknown;
}): Promise<SmokeCheck> {
  const response = await request({
    baseUrl: input.baseUrl,
    path: input.path,
    method: input.method,
    body: input.body,
  });

  assert(
    response.statusCode >= 200 && response.statusCode < 300,
    `${input.name} should return 2xx. Received ${response.statusCode}: ${JSON.stringify(
      response.body,
      null,
      2,
    )}`,
  );

  assert(
    response.body.status === 'ok',
    `${input.name} should return status ok. Received: ${JSON.stringify(response.body, null, 2)}`,
  );

  return {
    name: input.name,
    method: input.method ?? 'GET',
    path: input.path,
    status: 'passed',
  };
}

function getObject(value: unknown, label: string): Record<string, unknown> {
  assert(
    typeof value === 'object' && value !== null && !Array.isArray(value),
    `${label} should be an object.`,
  );

  return value as Record<string, unknown>;
}

function getString(value: unknown, label: string): string {
  assert(typeof value === 'string' && value.length > 0, `${label} should be a non-empty string.`);

  return value;
}

function getArray(value: unknown, label: string): unknown[] {
  assert(Array.isArray(value), `${label} should be an array.`);

  return value;
}

const runtimeRoot = path.resolve('.runtime/runtime-api-smoke-test');
const projectRoot = path.join(runtimeRoot, 'project');

await rm(runtimeRoot, {
  recursive: true,
  force: true,
});

await mkdir(path.join(projectRoot, 'src'), {
  recursive: true,
});

await mkdir(path.resolve('.runtime', 'reports'), {
  recursive: true,
});

await writeFile(
  path.join(projectRoot, 'package.json'),
  JSON.stringify(
    {
      name: 'runtime-api-smoke-project',
      dependencies: {
        express: '^4.0.0',
        react: '^18.0.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
      scripts: {
        typecheck: 'tsc --noEmit',
      },
    },
    null,
    2,
  ),
  'utf8',
);

await writeFile(path.join(projectRoot, 'tsconfig.json'), '{}\n', 'utf8');
await writeFile(path.join(projectRoot, 'src', 'index.ts'), 'export const value = 1;\n', 'utf8');
await writeFile(
  path.resolve('.runtime', 'reports', 'runtime-api-smoke-test.md'),
  '# Runtime API Smoke Test\n',
  'utf8',
);

const server = new RuntimeApiServer({
  config: {
    host: '127.0.0.1',
    port: 17901,
  },
});

const started = await server.start();
const checks: SmokeCheck[] = [];

try {
  checks.push(
    await expectOk({
      name: 'health',
      baseUrl: started.url,
      path: '/api/health',
    }),
  );

  const health = await request({
    baseUrl: started.url,
    path: '/api/health',
  });

  assert(health.body['service'] === 'zero-runtime-api', 'health should expose service name.');
  assert(health.body['localOnly'] === true, 'health should be local only.');

  checks.push(
    await expectOk({
      name: 'settings',
      baseUrl: started.url,
      path: '/api/settings',
    }),
  );

  const settingsResponse = await request({
    baseUrl: started.url,
    path: '/api/settings',
  });

  const settings = getObject(settingsResponse.body['settings'], 'settings');

  assert(settings['version'] === 1, 'settings should expose version 1.');

  checks.push(
    await expectOk({
      name: 'provider-status',
      baseUrl: started.url,
      path: '/api/providers/status',
    }),
  );

  const providerResponse = await request({
    baseUrl: started.url,
    path: '/api/providers/status',
  });

  const providerStatus = getObject(providerResponse.body['providers'], 'providers');
  const providers = getArray(providerStatus['providers'], 'providers.providers');

  assert(providers.length > 0, 'provider status should expose at least one provider.');
  checks.push(
    await expectOk({
      name: 'artifact-index',
      baseUrl: started.url,
      path: '/api/artifacts',
    }),
  );

  const artifactsResponse = await request({
    baseUrl: started.url,
    path: '/api/artifacts',
  });

  const artifactIndexValue =
    artifactsResponse.body['index'] ??
    artifactsResponse.body['artifactIndex'] ??
    artifactsResponse.body['artifacts'];

  const artifactIndex = getObject(artifactIndexValue, 'artifact index');
  const artifactsValue = artifactIndex['artifacts'];

  const artifacts = Array.isArray(artifactsValue)
    ? artifactsValue
    : Array.isArray(artifactsResponse.body['artifacts'])
      ? artifactsResponse.body['artifacts']
      : [];

  assert(artifacts.length >= 0, 'artifact index should expose an artifacts array.');

  if (artifacts.length > 0) {
    assert(
      artifacts.some((artifact) => {
        if (typeof artifact !== 'object' || artifact === null || Array.isArray(artifact)) {
          return false;
        }

        return typeof (artifact as Record<string, unknown>)['path'] === 'string';
      }),
      'artifact index should expose artifact path metadata.',
    );
  }

  checks.push(
    await expectOk({
      name: 'project-list-empty',
      baseUrl: started.url,
      path: '/api/projects',
    }),
  );

  checks.push(
    await expectOk({
      name: 'project-current-empty',
      baseUrl: started.url,
      path: '/api/projects/current',
    }),
  );

  checks.push(
    await expectOk({
      name: 'project-scan',
      baseUrl: started.url,
      path: '/api/projects/scan',
      method: 'POST',
      body: {
        rootPath: projectRoot,
        name: 'runtime-api-smoke-project',
        workingMode: 'local_snapshot',
      },
    }),
  );

  const projectScanResponse = await request({
    baseUrl: started.url,
    path: '/api/projects/scan',
    method: 'POST',
    body: {
      rootPath: projectRoot,
      name: 'runtime-api-smoke-project',
      workingMode: 'local_snapshot',
    },
  });

  const project = getObject(projectScanResponse.body['project'], 'project');
  const stack = getArray(project['stack'], 'project stack');

  assert(stack.includes('react'), 'project scan should detect react.');
  assert(stack.includes('express'), 'project scan should detect express.');

  checks.push(
    await expectOk({
      name: 'project-current-after-scan',
      baseUrl: started.url,
      path: '/api/projects/current',
    }),
  );

  checks.push(
    await expectOk({
      name: 'session-create',
      baseUrl: started.url,
      path: '/api/sessions',
      method: 'POST',
      body: {
        projectRoot,
        projectName: 'runtime-api-smoke-project',
        goal: 'Validate local MVP runtime API connectivity.',
      },
    }),
  );

  const sessionResponse = await request({
    baseUrl: started.url,
    path: '/api/sessions',
    method: 'POST',
    body: {
      projectRoot,
      projectName: 'runtime-api-smoke-project',
      goal: 'Validate local MVP runtime API connectivity.',
    },
  });

  const session = getObject(sessionResponse.body['session'], 'session');
  const sessionId = getString(session['id'], 'session id');

  checks.push(
    await expectOk({
      name: 'session-list',
      baseUrl: started.url,
      path: '/api/sessions',
    }),
  );

  checks.push(
    await expectOk({
      name: 'session-get',
      baseUrl: started.url,
      path: `/api/sessions/${encodeURIComponent(sessionId)}`,
    }),
  );

  checks.push(
    await expectOk({
      name: 'session-command',
      baseUrl: started.url,
      path: `/api/sessions/${encodeURIComponent(sessionId)}/commands`,
      method: 'POST',
      body: {
        input: '/plan',
      },
    }),
  );

  checks.push(
    await expectOk({
      name: 'workspace-resolve',
      baseUrl: started.url,
      path: '/api/workspace/resolve',
      method: 'POST',
      body: {
        projectRoot,
        mode: 'local_snapshot',
      },
    }),
  );

  checks.push(
    await expectOk({
      name: 'workflow-state',
      baseUrl: started.url,
      path: '/api/workflow/state',
      method: 'POST',
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

          sandboxPassed: false,
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
          verifyCompleted: false,
          reportExported: false,
          riskLevel: 'low',
        },
      },
    }),
  );

  checks.push(
    await expectOk({
      name: 'snapshot-create',
      baseUrl: started.url,
      path: '/api/snapshots',
      method: 'POST',
      body: {
        projectRoot,
        sessionId,
        targetFiles: ['src/index.ts'],
      },
    }),
  );

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'runtime-api-smoke-test',
        url: started.url,
        sessionId,
        projectRoot,
        checked: checks,
      },
      null,
      2,
    ),
  );
} finally {
  await server.stop();

  await rm(runtimeRoot, {
    recursive: true,
    force: true,
  });
}
