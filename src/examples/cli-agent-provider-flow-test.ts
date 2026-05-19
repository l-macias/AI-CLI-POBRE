import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CliRunner } from '../cli/CliRunner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const fixtureRoot = resolve('.runtime/cli-agent-provider-flow-test/project');

  await rm(resolve('.runtime/cli-agent-provider-flow-test'), {
    recursive: true,
    force: true,
  });

  await mkdir(resolve(fixtureRoot, 'src'), {
    recursive: true,
  });

  await writeFile(
    resolve(fixtureRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'cli-agent-provider-flow-fixture',
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

  await writeFile(resolve(fixtureRoot, 'src/index.ts'), 'export const value = 1;\n', 'utf8');

  const runner = new CliRunner();

  const blockedOpenRouter = await runner.run([
    'agent',
    'start',
    '--project',
    fixtureRoot,
    '--target',
    'src/index.ts',
    '--name',
    'CLI Agent Provider Flow Fixture',
    '--objective',
    'Should fail because OpenRouter needs explicit opt-in.',
    '--provider',
    'openrouter',
    '--model',
    'poolside/laguna-xs.2:free',
  ]);

  assert(
    blockedOpenRouter.status === 'error',
    'Agent OpenRouter start must fail without --allow-real-provider.',
  );
  assert(blockedOpenRouter.command === 'help', 'Parser failure should fallback to help command.');

  const startResult = await runner.run([
    'agent',
    'start',
    '--project',
    fixtureRoot,
    '--target',
    'src/index.ts',
    '--name',
    'CLI Agent Provider Flow Fixture',
    '--objective',
    'Persist OpenRouter provider config without calling real provider.',
    '--provider',
    'openrouter',
    '--allow-real-provider',
    '--model',
    'poolside/laguna-xs.2:free',
    '--estimated-completion-tokens',
    '1200',
    '--include-project-memory',
  ]);

  assert(startResult.status === 'ok', 'Agent start with explicit provider opt-in should pass.');
  assert(startResult.command === 'agent', 'Expected agent command.');

  const statePath = resolve(fixtureRoot, '.runtime/agent-loop-state.json');
  const reportPath = resolve(fixtureRoot, '.runtime/agent-loop-report.md');

  const stateRaw = await readFile(statePath, 'utf8');
  const reportRaw = await readFile(reportPath, 'utf8');

  assert(stateRaw.includes('"provider": "openrouter"'), 'Expected provider persisted in state.');
  assert(
    stateRaw.includes('"providerModel": "poolside/laguna-xs.2:free"'),
    'Expected provider model persisted in state.',
  );
  assert(
    stateRaw.includes('"allowRealProvider": true'),
    'Expected allowRealProvider persisted in state.',
  );
  assert(
    stateRaw.includes('"includeProjectMemory": true'),
    'Expected includeProjectMemory persisted in state.',
  );
  assert(
    stateRaw.includes('"estimatedCompletionTokens": 1200'),
    'Expected estimatedCompletionTokens persisted in state.',
  );
  assert(reportRaw.includes('Provider: openrouter'), 'Expected provider config in agent report.');
  assert(
    reportRaw.includes('Provider model: poolside/laguna-xs.2:free'),
    'Expected provider model in agent report.',
  );

  const formatted = runner.format(startResult, 'text');

  assert(
    formatted.includes('Provider: openrouter'),
    'Expected formatted CLI output to include provider.',
  );
  assert(
    formatted.includes('Model: poolside/laguna-xs.2:free'),
    'Expected formatted CLI output to include model.',
  );
  assert(
    formatted.includes('Real provider enabled: yes'),
    'Expected formatted CLI output to show real provider opt-in.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'cli-agent-provider-flow-test',
        statePath,
        reportPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'cli-agent-provider-flow-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
