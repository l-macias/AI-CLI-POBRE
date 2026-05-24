import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RuntimeApiServer } from '../api/RuntimeApiServer.js';

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

const testRoot = path.resolve('.runtime/patch-diff-api-test');
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
      name: 'patch-diff-api-fixture',
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
  path.join(projectRoot, 'src', 'components', 'ProfileCard.tsx'),
  'export function ProfileCard() { return <section>Profile</section>; }\n',
  'utf8',
);

const server = new RuntimeApiServer({
  config: {
    port: 17887,
  },
});

const started = await server.start();

try {
  const sessionResponse = await request({
    url: `${started.url}/sessions`,
    method: 'POST',
    body: {
      projectRoot,
      projectName: 'patch-diff-api-fixture',
      goal: 'Improve profile UI safely.',
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
      planId: 'runtime-plan-api-session-86-test',
      summary: 'Improve profile UI safely without applying files.',
      riskLevel: 'low',
      candidateFiles: [
        {
          path: 'src/components/ProfileCard.tsx',
          existsKnown: true,
          reason: 'Profile component is the selected candidate file from the runtime plan.',
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
  const files = getObject(diffResponse['files'], 'files');
  const diffFiles = getArray(diff['files'], 'diff files');
  const summary = getObject(diff['summary'], 'diff summary');

  assert(getString(diff['id'], 'diff id').startsWith('patch-diff-'), 'diff id should be valid');
  assert(diffFiles.length === 1, 'diff should include one file');
  assert(summary['filesChanged'] === 1, 'diff should report one changed file');
  assert(typeof files['diffPath'] === 'string', 'diff path should be returned');
  assert(typeof files['activeDiffPath'] === 'string', 'active diff path should be returned');

  const rejectedProposal = {
    ...proposal,
    status: 'rejected',
  };

  const blockedDiffResponse = await request({
    url: `${started.url}/patches/diff`,
    method: 'POST',
    body: {
      proposal: rejectedProposal,
    },
  });

  assert(blockedDiffResponse.status === 'error', 'rejected proposal diff should fail');

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'patch-diff-api-test',
        sessionId,
        proposalId: proposal['id'],
        diffId: diff['id'],
        filesChanged: summary['filesChanged'],
        diffPath: files['diffPath'],
        activeDiffPath: files['activeDiffPath'],
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
