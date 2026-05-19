import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CliRunner } from '../cli/CliRunner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const fixtureRoot = resolve('.runtime/cli-agent-provider-step-flow-test/project');
  const targetFile = 'src/index.ts';
  const providerModel = 'poolside/laguna-xs.2:free';

  await resetFixture(fixtureRoot);

  const runner = new CliRunner();

  const blockedStart = await runner.run([
    'agent',
    'start',
    '--project',
    fixtureRoot,
    '--target',
    targetFile,
    '--name',
    'CLI Agent Provider Step Flow Fixture',
    '--objective',
    'This should be blocked because OpenRouter lacks explicit opt-in.',
    '--provider',
    'openrouter',
    '--model',
    providerModel,
  ]);

  assert(
    blockedStart.status === 'error',
    'CLI agent start with OpenRouter must fail without --allow-real-provider.',
  );
  assert(blockedStart.command === 'help', 'CLI parse failure should fallback to help command.');

  const startResult = await runner.run([
    'agent',
    'start',
    '--project',
    fixtureRoot,
    '--target',
    targetFile,
    '--name',
    'CLI Agent Provider Step Flow Fixture',
    '--objective',
    'Validate CLI agent provider flow without applying patches.',
    '--provider',
    'openrouter',
    '--allow-real-provider',
    '--model',
    providerModel,
    '--estimated-completion-tokens',
    '1200',
    '--include-project-memory',
  ]);

  assert(startResult.status === 'ok', 'CLI agent start with provider opt-in should pass.');
  assert(startResult.command === 'agent', 'Expected agent command.');

  const formattedStart = runner.format(startResult, 'text');

  assert(
    formattedStart.includes('Provider: openrouter'),
    'Formatted start output should show OpenRouter provider.',
  );
  assert(
    formattedStart.includes(`Model: ${providerModel}`),
    'Formatted start output should show provider model.',
  );
  assert(
    formattedStart.includes('Real provider enabled: yes'),
    'Formatted start output should show real provider opt-in.',
  );
  assert(
    formattedStart.includes('Project memory: yes'),
    'Formatted start output should show project memory flag.',
  );

  const statePath = resolve(fixtureRoot, '.runtime/agent-loop-state.json');
  const reportPath = resolve(fixtureRoot, '.runtime/agent-loop-report.md');

  const stateAfterStartRaw = await readFile(statePath, 'utf8');

  assert(
    stateAfterStartRaw.includes('"provider": "openrouter"'),
    'Agent state should persist requested provider.',
  );
  assert(
    stateAfterStartRaw.includes(`"providerModel": "${providerModel}"`),
    'Agent state should persist requested provider model.',
  );
  assert(
    stateAfterStartRaw.includes('"allowRealProvider": true'),
    'Agent state should persist allowRealProvider.',
  );
  assert(
    stateAfterStartRaw.includes('"includeProjectMemory": true'),
    'Agent state should persist includeProjectMemory.',
  );

  const stepResult = await runner.run([
    'agent',
    'step',
    'request_repair_proposal',
    '--project',
    fixtureRoot,
  ]);

  assert(stepResult.status === 'ok', 'CLI agent request_repair_proposal step should pass.');
  assert(stepResult.command === 'agent', 'Expected agent step command.');

  const formattedStep = runner.format(stepResult, 'text');

  assert(
    formattedStep.includes('Zero Runtime agent'),
    'Formatted step output should be human-readable agent output.',
  );
  assert(formattedStep.includes('Action: step'), 'Formatted step output should show step action.');

  const stateAfterStepRaw = await readFile(statePath, 'utf8');
  const reportRaw = await readFile(reportPath, 'utf8');

  assert(
    stateAfterStepRaw.includes('"execution_request_repair_proposal"'),
    'Agent state should persist request_repair_proposal execution.',
  );
  assert(
    stateAfterStepRaw.includes('"agentProviderAudit"'),
    'Agent state should persist agentProviderAudit.',
  );
  assert(
    stateAfterStepRaw.includes('"requestedProvider": "openrouter"'),
    'Agent provider audit should include requested OpenRouter provider.',
  );
  assert(
    stateAfterStepRaw.includes('"selectedProvider": "openrouter"'),
    'Agent provider audit should include selected OpenRouter provider.',
  );
  assert(
    stateAfterStepRaw.includes('"policyStatus": "allowed"'),
    'Agent provider audit should include allowed policy status.',
  );

  assert(
    !stateAfterStepRaw.includes('"execution_apply_patch"'),
    'Provider flow must not apply patch automatically.',
  );
  assert(
    !stateAfterStepRaw.includes('"approvalScope": "patch_apply"'),
    'Provider flow must not request patch approval automatically.',
  );

  const parsedState = parseJsonObject(stateAfterStepRaw, 'agent loop state');
  const approvals = requireArray(parsedState['approvals'], 'approvals');

  assert(approvals.length === 0, 'request_repair_proposal must not create approvals.');

  const actions = requireArray(parsedState['actions'], 'actions');
  const applyAction = requireRecordByStringField(
    actions,
    'id',
    'agent-action-apply_patch',
    'Expected apply_patch action.',
  );

  assert(
    applyAction['status'] === 'pending',
    'request_repair_proposal must not execute apply_patch.',
  );

  const finalContent = await readFile(resolve(fixtureRoot, targetFile), 'utf8');

  assert(
    finalContent === 'export const value = 1;\n',
    'CLI provider flow must not modify target file.',
  );

  assert(
    reportRaw.includes('Provider: openrouter'),
    'Agent report should include provider config.',
  );
  assert(
    reportRaw.includes(`Provider model: ${providerModel}`),
    'Agent report should include provider model.',
  );

  const jsonFormatted = runner.format(stepResult, 'json');

  assert(
    jsonFormatted.includes('"command": "agent"'),
    'JSON formatter should include agent command.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'cli-agent-provider-step-flow-test',
        statePath,
        reportPath,
      },
      null,
      2,
    ),
  );
}

function parseJsonObject(raw: string, label: string): Record<string, unknown> {
  const parsed = JSON.parse(raw) as unknown;

  return requireRecord(parsed, label);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected object: ${label}`);
  }

  return value as Record<string, unknown>;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected array: ${label}`);
  }

  return value;
}

function requireRecordByStringField(
  values: readonly unknown[],
  field: string,
  expectedValue: string,
  message: string,
): Record<string, unknown> {
  for (const value of values) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      continue;
    }

    const record = value as Record<string, unknown>;

    if (record[field] === expectedValue) {
      return record;
    }
  }

  throw new Error(message);
}

async function resetFixture(projectRoot: string): Promise<void> {
  await rm(resolve('.runtime/cli-agent-provider-step-flow-test'), {
    recursive: true,
    force: true,
  });

  await mkdir(resolve(projectRoot, 'src'), {
    recursive: true,
  });

  await writeFile(
    resolve(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'cli-agent-provider-step-flow-fixture',
        scripts: {
          typecheck: 'tsc --noEmit',
        },
        devDependencies: {
          typescript: '^5.7.2',
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  await writeFile(
    resolve(projectRoot, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ),
    'utf8',
  );

  await writeFile(resolve(projectRoot, 'src/index.ts'), 'export const value = 1;\n', 'utf8');
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'cli-agent-provider-step-flow-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
