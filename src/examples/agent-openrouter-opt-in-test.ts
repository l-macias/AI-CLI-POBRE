import { AgentRuntimeBridge } from '../agent/AgentRuntimeBridge.js';
import type { CliRepairCommand } from '../cli/CliTypes.js';
import type { AgentLoopState } from '../agent/AgentTypes.js';
import type { JsonObject } from '../types/SharedTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

class RecordingCliBridge {
  public repairCommands: CliRepairCommand[] = [];

  public inspect(): Promise<unknown> {
    return Promise.resolve({});
  }

  public validate(): Promise<unknown> {
    return Promise.resolve({});
  }

  public git(): Promise<unknown> {
    return Promise.resolve({});
  }

  public repair(command: CliRepairCommand): Promise<unknown> {
    this.repairCommands.push(command);

    return Promise.resolve({
      id: 'repair-attempt-test',
      status: 'proposal_ready',
      proposal: {
        id: 'proposal-test',
        summary: 'Test proposal.',
        riskLevel: 'low',
        operations: [
          {
            kind: 'replace_file',
            targetFile: 'src/index.ts',
            newContent: 'export const value = 1;\n',
            reason: 'Test.',
          },
        ],
        explanation: 'Test.',
      },
      patchValidation: {
        valid: true,
        issues: [],
      },
      diffPreviews: [],
      modelPolicyDecision: {
        status: 'allowed',
        selectedModel: command.providerModel ?? 'fake-model',
      },
      providerFallbackUsed: command.provider !== 'openrouter',
    });
  }
}

async function main(): Promise<void> {
  const noOptInBridge = new RecordingCliBridge();
  const noOptInRuntime = new AgentRuntimeBridge({
    cliBridge: noOptInBridge,
  });

  const noOptInOutput = await noOptInRuntime.requestRepairProposal(
    createState({
      provider: 'openrouter',
      providerModel: 'poolside/laguna-xs.2:free',
      allowRealProvider: false,
      includeProjectMemory: true,
    }),
  );

  const noOptInCommand = requireCommand(noOptInBridge);

  assert(
    noOptInCommand.provider === 'fake-llm',
    'OpenRouter without opt-in must fallback to fake-llm.',
  );
  assert(
    noOptInCommand.allowRealProvider === false,
    'Fallback repair command must not allow real provider.',
  );
  assert(
    getAudit(noOptInOutput)['policyStatus'] === 'blocked',
    'No-opt-in output should include blocked provider audit.',
  );
  assert(
    getAudit(noOptInOutput)['selectedProvider'] === 'fake-llm',
    'No-opt-in audit should select fake fallback.',
  );

  const fakeBridge = new RecordingCliBridge();
  const fakeRuntime = new AgentRuntimeBridge({
    cliBridge: fakeBridge,
  });

  const fakeOutput = await fakeRuntime.requestRepairProposal(
    createState({
      provider: 'fake-llm',
      includeProjectMemory: true,
    }),
  );

  const fakeCommand = requireCommand(fakeBridge);

  assert(fakeCommand.provider === 'fake-llm', 'Fake provider should remain fake.');
  assert(
    fakeCommand.fakeProviderMode === 'markdown_json',
    'Agent fake provider should use markdown_json.',
  );
  assert(
    getAudit(fakeOutput)['policyStatus'] === 'allowed',
    'Fake provider output should include allowed audit.',
  );

  const openRouterBridge = new RecordingCliBridge();
  const openRouterRuntime = new AgentRuntimeBridge({
    cliBridge: openRouterBridge,
  });

  const openRouterOutput = await openRouterRuntime.requestRepairProposal(
    createState({
      provider: 'openrouter',
      providerModel: 'poolside/laguna-xs.2:free',
      allowRealProvider: true,
      estimatedCompletionTokens: 1200,
      includeProjectMemory: true,
    }),
  );

  const openRouterCommand = requireCommand(openRouterBridge);

  assert(
    openRouterCommand.provider === 'openrouter',
    'OpenRouter with opt-in should pass provider to repair command.',
  );
  assert(
    openRouterCommand.providerModel === 'poolside/laguna-xs.2:free',
    'OpenRouter with opt-in should pass provider model.',
  );
  assert(
    openRouterCommand.allowRealProvider === true,
    'OpenRouter with opt-in should pass allowRealProvider.',
  );
  assert(
    openRouterCommand.includeProjectMemory === true,
    'OpenRouter with opt-in should preserve memory flag.',
  );
  assert(
    getAudit(openRouterOutput)['policyStatus'] === 'allowed',
    'OpenRouter opt-in output should include allowed audit.',
  );
  assert(
    getAudit(openRouterOutput)['selectedProvider'] === 'openrouter',
    'OpenRouter opt-in audit should select OpenRouter.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'agent-openrouter-opt-in-test',
        checked: {
          noOptInProvider: noOptInCommand.provider,
          fakeProvider: fakeCommand.provider,
          openRouterProvider: openRouterCommand.provider,
        },
      },
      null,
      2,
    ),
  );
}

function createState(metadata: JsonObject): AgentLoopState {
  const now = new Date().toISOString();

  return {
    id: 'agent-openrouter-opt-in-test',
    status: 'running',
    objective: 'Test agent provider opt-in.',
    projectRoot: '/tmp/agent-openrouter-opt-in-test',
    projectName: 'Agent OpenRouter Opt-In Test',
    targetFiles: ['src/index.ts'],
    turns: [],
    actions: [],
    decisions: [],
    approvals: [],
    issues: [],
    createdAt: now,
    updatedAt: now,
    metadata,
  };
}

function requireCommand(bridge: RecordingCliBridge): CliRepairCommand {
  const command = bridge.repairCommands[0];

  if (!command) {
    throw new Error('Expected repair command to be recorded.');
  }

  return command;
}

function getAudit(output: unknown): Record<string, unknown> {
  if (typeof output !== 'object' || output === null || Array.isArray(output)) {
    throw new Error('Expected object output.');
  }

  const audit = (output as Record<string, unknown>)['agentProviderAudit'];

  if (typeof audit !== 'object' || audit === null || Array.isArray(audit)) {
    throw new Error('Expected agentProviderAudit object.');
  }

  return audit as Record<string, unknown>;
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'agent-openrouter-opt-in-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
