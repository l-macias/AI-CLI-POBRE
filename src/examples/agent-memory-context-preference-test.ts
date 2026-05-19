import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CliCommandParser } from '../cli/CliCommandParser.js';
import { CliRuntimeBridge } from '../cli/CliRuntimeBridge.js';
import type { CliAgentCommand, CliCommand, CliRepairCommand } from '../cli/CliTypes.js';
import { AgentRuntimeBridge } from '../agent/AgentRuntimeBridge.js';
import { AgentLoopReporter } from '../agent/AgentLoopReporter.js';
import { AgentLoopStateStore } from '../agent/AgentLoopStateStore.js';
import { InteractiveAgentLoop } from '../agent/InteractiveAgentLoop.js';
import type { AgentLoopState } from '../agent/AgentTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function requireCapturedCommand(value: CliRepairCommand | undefined): CliRepairCommand {
  if (!value) {
    throw new Error('Expected repair command to be captured.');
  }

  return value;
}
function assertAgentCommand(command: CliCommand): CliAgentCommand {
  if (command.name !== 'agent') {
    throw new Error(`Expected agent command but received ${command.name}.`);
  }

  return command;
}
class CapturingCliRuntimeBridge extends CliRuntimeBridge {
  public capturedRepairCommand?: CliRepairCommand | undefined;

  public override repair(command: CliRepairCommand): Promise<unknown> {
    this.capturedRepairCommand = command;

    return Promise.resolve({
      status: 'captured',
      includeProjectMemory: command.includeProjectMemory,
      provider: command.provider,
      allowRealProvider: command.allowRealProvider,
    });
  }
}

const parser = new CliCommandParser();

const defaultStart = parser.parse([
  'agent',
  'start',
  '--project',
  './target',
  '--target',
  'src/index.ts',
  '--name',
  'Agent Memory Preference Test',
  '--objective',
  'Run agent without project memory by default.',
]);

assert(defaultStart.ok, 'Default agent start should parse.');

if (defaultStart.ok) {
  const command = assertAgentCommand(defaultStart.command);

  assert(
    command.includeProjectMemory === false,
    'Agent start should not include project memory by default.',
  );
}

const memoryStart = parser.parse([
  'agent',
  'start',
  '--project',
  './target',
  '--target',
  'src/index.ts',
  '--name',
  'Agent Memory Preference Test',
  '--objective',
  'Run agent with project memory.',
  '--include-project-memory',
]);

assert(memoryStart.ok, 'Agent start with project memory should parse.');

if (memoryStart.ok) {
  const command = assertAgentCommand(memoryStart.command);

  assert(
    command.includeProjectMemory === true,
    'Agent start should parse includeProjectMemory flag.',
  );
}

const statePath = resolve('.runtime/agent-memory-context-preference-test/state.json');
const reportPath = resolve('.runtime/agent-memory-context-preference-test/report.md');

await rm(resolve('.runtime/agent-memory-context-preference-test'), {
  recursive: true,
  force: true,
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

const stateWithMemory = await loop.start({
  objective: 'Run agent with persisted project memory preference.',
  projectRoot: '/tmp/zero-agent-memory-preference-test',
  projectName: 'Agent Memory Preference Test',
  targetFiles: ['src/index.ts'],
  metadata: {
    includeProjectMemory: true,
  },
});

assert(
  stateWithMemory.metadata?.['includeProjectMemory'] === true,
  'Agent loop state should persist includeProjectMemory metadata.',
);

const storedRaw = await readFile(statePath, 'utf8');

assert(
  storedRaw.includes('"includeProjectMemory": true'),
  'Stored agent loop state should include project memory preference.',
);

const capturingBridge = new CapturingCliRuntimeBridge();
const runtimeBridge = new AgentRuntimeBridge({
  cliBridge: capturingBridge,
});

await runtimeBridge.requestRepairProposal(stateWithMemory);

const capturedWithMemory = requireCapturedCommand(capturingBridge.capturedRepairCommand);

assert(
  capturedWithMemory.includeProjectMemory === true,
  'AgentRuntimeBridge should pass includeProjectMemory=true to repair command.',
);
assert(
  capturedWithMemory.provider === 'fake-llm',
  'Agent memory preference must not switch provider to real model.',
);
assert(
  capturedWithMemory.allowRealProvider === false,
  'Agent memory preference must not allow real provider calls.',
);
assert(
  capturedWithMemory.allowPremium === false,
  'Agent memory preference must not allow premium models.',
);
assert(
  capturedWithMemory.premiumApproved === false,
  'Agent memory preference must not approve premium models.',
);

const stateWithoutMemory: AgentLoopState = {
  ...stateWithMemory,
  metadata: {
    includeProjectMemory: false,
  },
};

capturingBridge.capturedRepairCommand = undefined;

await runtimeBridge.requestRepairProposal(stateWithoutMemory);

const capturedWithoutMemory = requireCapturedCommand(capturingBridge.capturedRepairCommand);

assert(
  capturedWithoutMemory.includeProjectMemory === false,
  'AgentRuntimeBridge should pass includeProjectMemory=false when metadata is false.',
);

const stateWithoutMetadata: AgentLoopState = {
  ...stateWithMemory,
  metadata: undefined,
};

capturingBridge.capturedRepairCommand = undefined;

await runtimeBridge.requestRepairProposal(stateWithoutMetadata);

const capturedWithoutMetadata = requireCapturedCommand(capturingBridge.capturedRepairCommand);

assert(
  capturedWithoutMetadata.includeProjectMemory === false,
  'AgentRuntimeBridge should default includeProjectMemory=false when metadata is absent.',
);

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'agent-memory-context-preference-test',
      persistedIncludeProjectMemory: stateWithMemory.metadata?.['includeProjectMemory'],
      capturedWithMemory: capturedWithMemory.includeProjectMemory,
      capturedWithoutMemory: capturedWithoutMemory.includeProjectMemory,
      capturedWithoutMetadata: capturedWithoutMetadata.includeProjectMemory,
    },
    null,
    2,
  ),
);
