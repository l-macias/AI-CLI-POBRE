import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AgentLoopReporter } from '../agent/AgentLoopReporter.js';
import { AgentLoopStateStore } from '../agent/AgentLoopStateStore.js';
import { InteractiveAgentLoop } from '../agent/InteractiveAgentLoop.js';
import type { AgentLoopState } from '../agent/AgentTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const runtimeRoot = resolve('.runtime/security-agent-state-tampering-test/runtime');
  const statePath = resolve(runtimeRoot, 'state.json');
  const reportPath = resolve(runtimeRoot, 'report.md');

  await rm(resolve('.runtime/security-agent-state-tampering-test'), {
    recursive: true,
    force: true,
  });

  await mkdir(runtimeRoot, {
    recursive: true,
  });

  const store = new AgentLoopStateStore({
    outputPath: statePath,
  });

  const reporter = new AgentLoopReporter({
    outputPath: reportPath,
  });

  const loop = new InteractiveAgentLoop({
    store,
    reporter,
  });

  const validState = await loop.start({
    objective: 'Validate agent state hardening.',
    projectRoot: resolve('.runtime/security-agent-state-tampering-test/project'),
    projectName: 'Security Agent State Tampering Fixture',
    targetFiles: ['src/index.ts'],
  });

  const loadedValid = await store.load();

  assert(loadedValid.id === validState.id, 'Valid persisted agent state should load.');

  await expectInvalidState({
    statePath,
    state: {
      ...validState,
      actions: validState.actions.map((action) => {
        if (action.kind !== 'apply_patch') {
          return action;
        }

        return {
          ...action,
          requiresApproval: false,
        };
      }),
    },
    expectedMessage: 'apply_patch action must require approval',
  });

  await expectInvalidState({
    statePath,
    state: {
      ...validState,
      actions: [
        ...validState.actions,
        {
          ...requireAction(validState, 'agent-action-apply_patch'),
          id: 'agent-action-apply_patch-duplicate',
        },
      ],
    },
    expectedMessage: 'duplicate action kind: apply_patch',
  });

  await expectInvalidState({
    statePath,
    state: {
      ...validState,
      approvals: [
        {
          id: 'tampered-approval-no-fingerprint',
          scope: 'patch_apply',
          status: 'approved',
          actionId: 'agent-action-apply_patch',
          reason: 'Tampered approval without fingerprint.',
          requestedAt: new Date().toISOString(),
          decidedAt: new Date().toISOString(),
          decisionReason: 'Injected approval.',
          metadata: {
            proposalId: 'proposal-without-fingerprint',
          },
        },
      ],
    },
    expectedMessage: 'must include proposalFingerprint metadata',
  });

  await expectInvalidState({
    statePath,
    state: {
      ...validState,
      approvals: [
        {
          id: 'tampered-approval-wrong-action',
          scope: 'patch_apply',
          status: 'approved',
          actionId: 'agent-action-report_result',
          reason: 'Tampered approval for wrong action.',
          requestedAt: new Date().toISOString(),
          decidedAt: new Date().toISOString(),
          decisionReason: 'Injected approval.',
          metadata: {
            proposalId: 'proposal-1',
            proposalFingerprint: 'abc123',
          },
        },
      ],
    },
    expectedMessage: 'must target agent-action-apply_patch',
  });

  await expectInvalidState({
    statePath,
    state: {
      ...validState,
      status: 'completed',
      completedAt: undefined,
    },
    expectedMessage: 'terminal status completed requires completedAt',
  });

  const tamperedInvalidTurnState: unknown = {
    ...validState,
    turns: [
      ...validState.turns,
      {
        id: 'tampered-turn',
        role: 'evil',
        message: 'Injected invalid role.',
        createdAt: new Date().toISOString(),
      },
    ],
  };

  await expectInvalidState({
    statePath,
    state: tamperedInvalidTurnState,
    expectedMessage: 'turns must be a valid AgentTurn array',
  });

  await expectInvalidState({
    statePath,
    state: {
      ...validState,
      metadata: {
        injectedFunction: '[function should not exist as actual function]',
        nested: {
          ok: true,
        },
      },
    },
    expectedMessage: '',
    shouldLoad: true,
  });

  await writeFile(
    statePath,
    JSON.stringify(
      {
        ...validState,
        metadata: {
          invalidUndefinedEquivalent: undefined,
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  const loadedJsonSafeMetadata = await store.load();

  assert(
    loadedJsonSafeMetadata.metadata !== undefined,
    'JSON-safe metadata should still load after JSON stringify drops undefined fields.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'security-agent-state-tampering-test',
      },
      null,
      2,
    ),
  );
}

function requireAction(state: AgentLoopState, actionId: string) {
  const action = state.actions.find((item) => item.id === actionId);

  if (!action) {
    throw new Error(`Missing expected action: ${actionId}`);
  }

  return action;
}

async function expectInvalidState(input: {
  statePath: string;
  state: unknown;
  expectedMessage: string;
  shouldLoad?: boolean | undefined;
}): Promise<void> {
  await writeFile(input.statePath, JSON.stringify(input.state, null, 2), 'utf8');

  let loaded = false;
  let errorMessage = '';

  try {
    await new AgentLoopStateStore({
      outputPath: input.statePath,
    }).load();

    loaded = true;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  if (input.shouldLoad === true) {
    assert(loaded, `Expected state to load but got: ${errorMessage}`);
    return;
  }

  assert(!loaded, 'Expected tampered state to be rejected.');
  assert(
    errorMessage.includes(input.expectedMessage),
    `Expected error to include "${input.expectedMessage}" but got "${errorMessage}".`,
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'security-agent-state-tampering-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
