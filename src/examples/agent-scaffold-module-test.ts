import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AgentLoopReporter } from '../agent/AgentLoopReporter.js';
import { AgentLoopStateStore } from '../agent/AgentLoopStateStore.js';
import { AgentStepExecutor } from '../agent/AgentStepExecutor.js';
import { InteractiveAgentLoop } from '../agent/InteractiveAgentLoop.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const fixtureRoot = resolve('.runtime/agent-scaffold-module-test/project');
  const runtimeRoot = resolve(fixtureRoot, '.runtime');
  const statePath = resolve(runtimeRoot, 'agent-loop-state.json');
  const reportPath = resolve(runtimeRoot, 'agent-loop-report.md');

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
    objective: 'Scaffold auth module through agent without applying files.',
    projectRoot: fixtureRoot,
    projectName: 'Agent Scaffold Module Fixture',
    targetFiles: ['src/modules/auth'],
    metadata: {
      scaffoldModuleName: 'auth',
      scaffoldModuleKind: 'backend',
      scaffoldTargetPath: 'src/modules/auth',
      scaffoldProvider: 'fake-llm',
      scaffoldOverwriteExisting: false,
      scaffoldDryRun: true,
      includeProjectMemory: false,
    },
  });

  assert(
    state.actions.some((action) => action.id === 'agent-action-scaffold_module'),
    'Expected scaffold_module action to exist.',
  );

  const executor = new AgentStepExecutor({
    store,
    reporter,
  });

  state = await executor.execute(state, 'agent-action-scaffold_module');

  assert(
    state.actions.some(
      (action) => action.id === 'agent-action-scaffold_module' && action.status === 'executed',
    ),
    'Expected scaffold_module action to execute.',
  );

  const scaffoldSummary = getMetadataObject(state, 'execution_scaffold_module');

  assert(scaffoldSummary['status'] === 'patch_ready', 'Expected patch_ready scaffold summary.');
  assert(scaffoldSummary['safetySafe'] === true, 'Expected safe scaffold summary.');
  assert(scaffoldSummary['operationCount'] === 3, 'Expected three scaffold operations.');
  assert(scaffoldSummary['diffPreviewCount'] === 3, 'Expected three scaffold diff previews.');
  assert(
    typeof scaffoldSummary['patchProposalId'] === 'string' &&
      scaffoldSummary['patchProposalId'].includes('patch-from-scaffold-proposal-auth'),
    'Expected scaffold patch proposal id.',
  );

  assert(
    state.approvals.length === 0,
    'Agent scaffold_module must not create approvals automatically.',
  );

  const applyAction = state.actions.find((action) => action.id === 'agent-action-apply_patch');

  assert(applyAction?.status === 'pending', 'Agent scaffold_module must not apply patch.');

  const generatedIndex = await readOptionalFile(resolve(fixtureRoot, 'src/modules/auth/index.ts'));

  assert(generatedIndex === undefined, 'Agent scaffold_module must not write scaffold files.');

  const stateRaw = await readFile(statePath, 'utf8');
  const reportRaw = await readFile(reportPath, 'utf8');
  const scaffoldReportRaw = await readFile(
    resolve(fixtureRoot, '.runtime/agent-scaffold-report.json'),
    'utf8',
  );

  assert(
    stateRaw.includes('"execution_scaffold_module"'),
    'Expected scaffold execution metadata in state.',
  );
  assert(reportRaw.includes('scaffold_module'), 'Expected scaffold action in agent report.');
  assert(
    scaffoldReportRaw.includes('"status": "patch_ready"'),
    'Expected agent scaffold report patch_ready.',
  );
  assert(
    scaffoldReportRaw.includes('"diffPreviews"'),
    'Expected agent scaffold report diff previews.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'agent-scaffold-module-test',
        actionStatus: 'executed',
        scaffoldStatus: scaffoldSummary['status'],
        operationCount: scaffoldSummary['operationCount'],
        diffPreviewCount: scaffoldSummary['diffPreviewCount'],
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

async function readOptionalFile(targetPath: string): Promise<string | undefined> {
  try {
    return await readFile(targetPath, 'utf8');
  } catch {
    return undefined;
  }
}

async function resetFixture(projectRoot: string): Promise<void> {
  await rm(resolve('.runtime/agent-scaffold-module-test'), {
    recursive: true,
    force: true,
  });

  await mkdir(resolve(projectRoot, 'src/modules'), {
    recursive: true,
  });

  await writeFile(
    resolve(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'agent-scaffold-module-fixture',
        dependencies: {
          express: '^5.0.0',
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

  await writeFile(resolve(projectRoot, 'package-lock.json'), '{}\n', 'utf8');

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
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'agent-scaffold-module-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
