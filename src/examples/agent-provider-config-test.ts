import { AgentProviderConfigReader } from '../agent/AgentProviderConfigReader.js';
import { defaultAgentProviderConfig } from '../agent/AgentProviderConfig.js';
import type { CliAgentCommand } from '../cli/CliTypes.js';
import type { JsonObject } from '../types/SharedTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const reader = new AgentProviderConfigReader();

const defaults = reader.fromMetadata(undefined);

assert(defaults.provider === defaultAgentProviderConfig.provider, 'Expected default provider.');
assert(defaults.provider === 'fake-llm', 'Expected fake-llm as default agent provider.');
assert(
  defaults.fakeProviderMode === 'markdown_json',
  'Expected markdown_json as default agent fake mode.',
);
assert(defaults.allowRealProvider === false, 'Default must not allow real provider.');
assert(defaults.allowPremium === false, 'Default must not allow premium.');
assert(defaults.premiumApproved === false, 'Default must not approve premium.');
assert(defaults.includeProjectMemory === false, 'Default must not include project memory.');

const cliCommand: CliAgentCommand = {
  name: 'agent',
  action: 'start',
  format: 'json',
  projectRoot: '/tmp/zero-agent-provider-config',
  projectName: 'Agent Provider Config Fixture',
  objective: 'Test provider config persistence.',
  targetFiles: ['src/index.ts'],
  confirmReset: false,
  includeProjectMemory: true,
  provider: 'openrouter',
  fakeProviderMode: 'markdown_json',
  providerModel: 'poolside/laguna-xs.2:free',
  estimatedCompletionTokens: 1200,
  allowRealProvider: true,
  allowPremium: false,
  premiumApproved: false,
};

const fromCli = reader.fromCliCommand(cliCommand);

assert(fromCli.provider === 'openrouter', 'Expected provider from CLI command.');
assert(
  fromCli.providerModel === 'poolside/laguna-xs.2:free',
  'Expected provider model from CLI command.',
);
assert(fromCli.allowRealProvider, 'Expected allowRealProvider from CLI command.');
assert(fromCli.includeProjectMemory, 'Expected includeProjectMemory from CLI command.');
assert(fromCli.estimatedCompletionTokens === 1200, 'Expected estimated completion tokens.');

const metadata = reader.toMetadata(fromCli);

assert(metadata['provider'] === 'openrouter', 'Expected provider metadata.');
assert(
  metadata['providerModel'] === 'poolside/laguna-xs.2:free',
  'Expected provider model metadata.',
);
assert(metadata['allowRealProvider'] === true, 'Expected allowRealProvider metadata.');
assert(metadata['includeProjectMemory'] === true, 'Expected includeProjectMemory metadata.');
assert(
  metadata['estimatedCompletionTokens'] === 1200,
  'Expected estimatedCompletionTokens metadata.',
);

const fromMetadata = reader.fromMetadata(metadata);

assert(fromMetadata.provider === 'openrouter', 'Expected provider from metadata.');
assert(
  fromMetadata.providerModel === 'poolside/laguna-xs.2:free',
  'Expected provider model from metadata.',
);
assert(fromMetadata.allowRealProvider, 'Expected real provider opt-in from metadata.');
assert(fromMetadata.includeProjectMemory, 'Expected memory flag from metadata.');

const malformedMetadata: JsonObject = {
  provider: 'unknown-provider',
  fakeProviderMode: 'unknown-mode',
  providerModel: '',
  estimatedCompletionTokens: -5,
  allowRealProvider: 'true',
  allowPremium: 'true',
  premiumApproved: 'true',
  includeProjectMemory: 'true',
};

const normalized = reader.fromMetadata(malformedMetadata);

assert(normalized.provider === 'fake-llm', 'Malformed provider should fall back to fake-llm.');
assert(normalized.fakeProviderMode === 'markdown_json', 'Malformed fake mode should fall back.');
assert(normalized.providerModel === undefined, 'Blank provider model should be undefined.');
assert(
  normalized.estimatedCompletionTokens === undefined,
  'Invalid estimated tokens should be undefined.',
);
assert(normalized.allowRealProvider === false, 'String allowRealProvider must not become true.');
assert(normalized.allowPremium === false, 'String allowPremium must not become true.');
assert(normalized.premiumApproved === false, 'String premiumApproved must not become true.');
assert(
  normalized.includeProjectMemory === false,
  'String includeProjectMemory must not become true.',
);

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'agent-provider-config-test',
      provider: fromMetadata.provider,
      providerModel: fromMetadata.providerModel,
      allowRealProvider: fromMetadata.allowRealProvider,
    },
    null,
    2,
  ),
);
