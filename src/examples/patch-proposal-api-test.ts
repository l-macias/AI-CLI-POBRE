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

const testRoot = path.resolve('.runtime/patch-proposal-api-test');
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
      name: 'patch-proposal-api-fixture',
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
    port: 17886,
  },
});

const started = await server.start();

try {
  const sessionResponse = await request({
    url: `${started.url}/sessions`,
    method: 'POST',
    body: {
      projectRoot,
      projectName: 'patch-proposal-api-fixture',
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
      planId: 'runtime-plan-api-session-85-test',
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
  const validation = getObject(patchResponse['validation'], 'validation');
  const files = getObject(patchResponse['files'], 'files');
  const proposalFiles = getArray(proposal['files'], 'proposal files');

  assert(validation['valid'] === true, 'patch proposal should be valid');
  assert(proposal['status'] === 'validated', 'patch proposal should be validated');
  assert(proposalFiles.length === 1, 'patch proposal should include one file');
  assert(typeof files['proposalPath'] === 'string', 'proposal path should be returned');
  assert(
    typeof files['activeProposalPath'] === 'string',
    'active proposal path should be returned',
  );

  const blockedResponse = await request({
    url: `${started.url}/patches/propose`,
    method: 'POST',
    body: {
      sessionId,
      planId: 'runtime-plan-api-session-85-blocked-test',
      summary: 'Modify env file.',
      riskLevel: 'high',
      candidateFiles: [
        {
          path: '.env',
          existsKnown: true,
          reason: 'This must be rejected because it targets a protected secret file.',
        },
      ],
    },
  });

  assert(blockedResponse.status === 'ok', JSON.stringify(blockedResponse, null, 2));

  const blockedProposal = getObject(blockedResponse['proposal'], 'blocked proposal');
  const blockedValidation = getObject(blockedResponse['validation'], 'blocked validation');
  const blockedIssues = getArray(blockedValidation['issues'], 'blocked issues');

  assert(blockedValidation['valid'] === false, 'blocked proposal should be invalid');
  assert(blockedProposal['status'] === 'rejected', 'blocked proposal should be rejected');
  assert(
    blockedIssues.some((issue) => {
      const issueObject = getObject(issue, 'blocked issue');

      return issueObject['code'] === 'PROTECTED_PATCH_PATH_NOT_ALLOWED';
    }),
    'blocked proposal should include protected path issue',
  );

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'patch-proposal-api-test',
        sessionId,
        proposalId: proposal['id'],
        proposalStatus: proposal['status'],
        proposalFiles: proposalFiles.length,
        blockedStatus: blockedProposal['status'],
        proposalPath: files['proposalPath'],
        activeProposalPath: files['activeProposalPath'],
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
