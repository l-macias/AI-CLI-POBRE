import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { AgentLoopReporter } from '../agent/AgentLoopReporter.js';
import { AgentLoopStateStore } from '../agent/AgentLoopStateStore.js';
import { AgentStepExecutor } from '../agent/AgentStepExecutor.js';
import { InteractiveAgentLoop } from '../agent/InteractiveAgentLoop.js';

const execFileAsync = promisify(execFile);

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  if (process.env['ZERO_RUNTIME_RUN_REAL_PROVIDER_SMOKE'] !== 'true') {
    console.info(
      JSON.stringify(
        {
          status: 'skipped',
          test: 'agent-real-provider-smoke-test',
          reason:
            'Set ZERO_RUNTIME_RUN_REAL_PROVIDER_SMOKE=true to run this optional real provider smoke test.',
        },
        null,
        2,
      ),
    );

    return;
  }

  if (!process.env['OPENROUTER_API_KEY']) {
    console.info(
      JSON.stringify(
        {
          status: 'skipped',
          test: 'agent-real-provider-smoke-test',
          reason: 'OPENROUTER_API_KEY is required for this optional real provider smoke test.',
        },
        null,
        2,
      ),
    );

    return;
  }

  const fixtureRoot = resolve('.runtime/agent-real-provider-smoke-test/project');
  const runtimeRoot = resolve(fixtureRoot, '.runtime');
  const statePath = resolve(runtimeRoot, 'agent-loop-state.json');
  const reportPath = resolve(runtimeRoot, 'agent-loop-report.md');
  const targetFile = 'src/index.ts';
  const providerModel =
    process.env['ZERO_RUNTIME_OPENROUTER_SMOKE_MODEL'] ?? 'poolside/laguna-xs.2:free';

  await resetFixture(fixtureRoot);

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

  let state = await loop.start({
    objective:
      'Return a safe minimal patch proposal for src/index.ts. Do not apply changes. Do not include secrets.',
    projectRoot: fixtureRoot,
    projectName: 'Agent Real Provider Smoke Fixture',
    targetFiles: [targetFile],
    metadata: {
      provider: 'openrouter',
      fakeProviderMode: 'markdown_json',
      providerModel,
      estimatedCompletionTokens: 1200,
      allowRealProvider: true,
      allowPremium: false,
      premiumApproved: false,
      includeProjectMemory: false,
    },
  });

  const executor = new AgentStepExecutor({
    store,
    reporter,
  });

  state = await executor.execute(state, 'agent-action-request_repair_proposal');

  if (!state.metadata?.['execution_request_repair_proposal']) {
    throw new Error(
      [
        'Real provider smoke did not produce execution_request_repair_proposal.',
        'The request_repair_proposal step likely failed before metadata persistence.',
        `Issues: ${JSON.stringify(state.issues, null, 2)}`,
        `Last execution: ${JSON.stringify(state.metadata?.['lastExecution'] ?? null, null, 2)}`,
      ].join('\n'),
    );
  }

  const repairExecution = getMetadataObject(state, 'execution_request_repair_proposal');
  const providerAudit = getNestedObject(repairExecution, 'agentProviderAudit');

  assert(
    providerAudit['policyStatus'] === 'allowed',
    'Real provider smoke should have allowed provider policy.',
  );
  assert(
    providerAudit['selectedProvider'] === 'openrouter',
    'Real provider smoke should select OpenRouter.',
  );
  assert(
    providerAudit['selectedModel'] === providerModel,
    'Real provider smoke should select configured model.',
  );

  assert(
    repairExecution['status'] !== 'unknown',
    'Real provider smoke should persist repair execution status.',
  );

  const applyAction = state.actions.find((action) => action.id === 'agent-action-apply_patch');

  assert(
    applyAction?.status === 'pending',
    'Real provider smoke must not apply patches automatically.',
  );

  assert(
    state.approvals.length === 0,
    'Real provider smoke must not create approval requests during repair proposal step.',
  );

  const finalContent = await readFile(resolve(fixtureRoot, targetFile), 'utf8');

  assert(
    finalContent === 'export const value = 1;\n',
    'Real provider smoke must not modify target file.',
  );

  const stateRaw = await readFile(statePath, 'utf8');
  const reportRaw = await readFile(reportPath, 'utf8');

  assert(
    stateRaw.includes('"agentProviderAudit"'),
    'Real provider smoke state should include agentProviderAudit.',
  );
  assert(
    stateRaw.includes('"selectedProvider": "openrouter"'),
    'Real provider smoke state should include selected OpenRouter provider.',
  );
  assert(
    reportRaw.includes('Provider: openrouter'),
    'Real provider smoke report should include OpenRouter provider.',
  );
  assert(
    !stateRaw.includes(process.env['OPENROUTER_API_KEY'] ?? 'impossible-secret-marker'),
    'Real provider smoke state must not leak OPENROUTER_API_KEY.',
  );
  assert(
    !reportRaw.includes(process.env['OPENROUTER_API_KEY'] ?? 'impossible-secret-marker'),
    'Real provider smoke report must not leak OPENROUTER_API_KEY.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'agent-real-provider-smoke-test',
        providerModel,
        repairStatus: repairExecution['status'],
        providerPolicyStatus: providerAudit['policyStatus'],
        selectedProvider: providerAudit['selectedProvider'],
      },
      null,
      2,
    ),
  );
}

function getMetadataObject(
  state: {
    metadata?: Record<string, unknown> | undefined;
  },
  key: string,
): Record<string, unknown> {
  const value = state.metadata?.[key];

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected metadata object: ${key}`);
  }

  return value as Record<string, unknown>;
}

function getNestedObject(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Expected nested object: ${key}`);
  }

  return value as Record<string, unknown>;
}

async function resetFixture(projectRoot: string): Promise<void> {
  await rm(resolve('.runtime/agent-real-provider-smoke-test'), {
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
        name: 'agent-real-provider-smoke-fixture',
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

  await execFileAsync('git', ['init', '-b', 'test-branch'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'user.email', 'zero-runtime@example.local'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'user.name', 'Zero Runtime Test'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'core.autocrlf', 'false'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'core.eol', 'lf'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await writeFile(resolve(projectRoot, '.gitattributes'), '* text eol=lf\n', 'utf8');

  await execFileAsync('git', ['add', '.'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['commit', '-m', 'initial commit'], {
    cwd: projectRoot,
    windowsHide: true,
  });
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'agent-real-provider-smoke-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
