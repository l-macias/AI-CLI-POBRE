import { CliCommandParser } from '../cli/CliCommandParser.js';
import type { CliCommand, CliRepairCommand } from '../cli/CliTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertRepairCommand(command: CliCommand): CliRepairCommand {
  if (command.name !== 'repair') {
    throw new Error(`Expected repair command but received ${command.name}.`);
  }

  return command;
}

const parser = new CliCommandParser();

const blocked = parser.parse([
  'repair',
  '--project',
  './target',
  '--target',
  'src/example.ts',
  '--objective',
  'Fix the file safely.',
  '--provider',
  'openrouter',
  '--model',
  'provider-strategy/model-from-cli',
]);

assert(!blocked.ok, 'OpenRouter repair provider should require explicit real-provider opt-in.');

if (!blocked.ok) {
  assert(
    blocked.issues.some((issue) => issue.code === 'CLI_INVALID_PROJECT_COMMAND'),
    'Missing --allow-real-provider should surface as invalid project command.',
  );
  assert(
    blocked.issues.some((issue) =>
      issue.message.includes('CLI_REPAIR_REAL_PROVIDER_OPT_IN_REQUIRED'),
    ),
    'Missing --allow-real-provider should include specific opt-in issue.',
  );
}

const allowed = parser.parse([
  'repair',
  '--project',
  './target',
  '--target',
  'src/example.ts',
  '--objective',
  'Fix the file safely.',
  '--provider',
  'openrouter',
  '--allow-real-provider',
  '--model',
  'provider-strategy/model-from-cli',
  '--estimated-completion-tokens',
  '900',
  '--allow-premium',
  '--premium-approved',
]);

assert(allowed.ok, 'OpenRouter repair provider should parse with explicit opt-in.');

if (allowed.ok) {
  const command = assertRepairCommand(allowed.command);

  assert(command.provider === 'openrouter', 'Expected openrouter provider.');
  assert(command.allowRealProvider, 'Expected real provider opt-in flag.');
  assert(
    command.providerModel === 'provider-strategy/model-from-cli',
    'Expected CLI model to be parsed.',
  );
  assert(
    command.estimatedCompletionTokens === 900,
    'Expected estimated completion tokens to be parsed.',
  );
  assert(command.allowPremium, 'Expected allowPremium to be parsed.');
  assert(command.premiumApproved, 'Expected premiumApproved to be parsed.');
}

const fakeDefault = parser.parse(['repair', '--project', './target', '--target', 'src/example.ts']);

assert(fakeDefault.ok, 'Default repair provider should still parse.');

if (fakeDefault.ok) {
  const command = assertRepairCommand(fakeDefault.command);

  assert(command.provider === 'fake-llm', 'Default repair provider should remain fake.');
  assert(
    command.allowRealProvider === false,
    'Default fake provider must not imply real-provider opt-in.',
  );
}

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'cli-repair-openrouter-provider-test',
    },
    null,
    2,
  ),
);
