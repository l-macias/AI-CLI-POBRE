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

const server = new RuntimeApiServer({
  config: {
    port: 17891,
  },
});

const started = await server.start();

try {
  const response = await request({
    url: `${started.url}/workflow/state`,
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
        riskLevel: 'high',
      },
    },
  });

  assert(response.status === 'ok', JSON.stringify(response, null, 2));

  const workflow = getObject(response['workflow'], 'workflow');
  const nextAction = getObject(response['nextAction'], 'nextAction');
  const steps = getArray(workflow['steps'], 'workflow steps');

  assert(workflow['snapshotRequired'] === true, 'high risk workflow should require snapshot');
  assert(workflow['currentStepId'] === 'snapshot', 'snapshot should be current step');
  assert(nextAction['actionId'] === 'create_snapshot', 'next action should create snapshot');
  assert(steps.length > 0, 'workflow should include steps');

  const lowRiskResponse = await request({
    url: `${started.url}/workflow/state`,
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
  });

  assert(lowRiskResponse.status === 'ok', JSON.stringify(lowRiskResponse, null, 2));

  const lowRiskWorkflow = getObject(lowRiskResponse['workflow'], 'low risk workflow');
  const lowRiskNextAction = getObject(lowRiskResponse['nextAction'], 'low risk next action');

  assert(lowRiskWorkflow['snapshotRequired'] === false, 'low risk should not require snapshot');
  assert(
    lowRiskWorkflow['currentStepId'] === 'snapshot',
    'snapshot is still optional current step',
  );
  assert(
    lowRiskNextAction['actionId'] === 'create_snapshot',
    'optional snapshot should still be suggested first',
  );

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        test: 'runtime-workflow-state-api-test',
        highRiskCurrentStep: workflow['currentStepId'],
        highRiskNextAction: nextAction['actionId'],
        lowRiskSnapshotRequired: lowRiskWorkflow['snapshotRequired'],
        lowRiskNextAction: lowRiskNextAction['actionId'],
      },
      null,
      2,
    ),
  );
} finally {
  await server.stop();
}
