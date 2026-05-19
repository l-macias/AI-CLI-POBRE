import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FakeModuleGeneratorProvider } from '../scaffold/ModuleGeneratorProvider.js';
import { ScaffoldReporter } from '../scaffold/ScaffoldReporter.js';
import { ScaffoldRunner } from '../scaffold/ScaffoldRunner.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const projectRoot = resolve('.runtime/scaffold-runner-test/project');
  const reportPath = resolve(projectRoot, '.runtime/scaffold-report.json');

  await resetFixture(projectRoot);

  const runner = new ScaffoldRunner({
    reporter: new ScaffoldReporter({
      outputPath: reportPath,
    }),
  });

  const result = await runner.run({
    projectRoot,
    objective: 'Create auth module proposal only.',
    intent: {
      kind: 'module',
      name: 'auth',
      moduleKind: 'backend',
      targetPath: 'src/modules/auth',
      provider: 'fake-llm',
      allowRealProvider: false,
      allowPremium: false,
      premiumApproved: false,
      includeProjectMemory: false,
      overwriteExisting: false,
      dryRun: true,
    },
  });

  assert(result.status === 'patch_ready', 'Expected scaffold runner to produce patch_ready.');
  assert(result.intent?.normalizedName === 'auth', 'Expected normalized intent.');
  assert(result.request !== undefined, 'Expected scaffold request.');
  assert(result.providerResult?.provider === 'fake-llm', 'Expected provider metadata.');
  assert(result.proposal !== undefined, 'Expected scaffold proposal.');
  assert(result.proposalValidation.valid, 'Expected valid proposal schema.');
  assert(result.safety.safe, 'Expected safe scaffold proposal.');
  assert(result.patchProposal !== undefined, 'Expected patch proposal.');
  assert(
    result.patchProposal?.operations.length === 3,
    'Expected patch proposal operations from scaffold files.',
  );
  assert(result.diffPreviews.length === 3, 'Expected diff previews for scaffold patch operations.');
  assert(
    result.diffPreviews.every((preview) => preview.changed),
    'Expected scaffold diff previews to be marked changed.',
  );
  assert(
    result.diffPreviews.some((preview) => preview.markdown.includes('```diff')),
    'Expected markdown diff previews.',
  );
  assert(result.failures.length === 0, 'Expected no failures.');
  assert(
    result.steps.some((step) => step.id === 'build_patch_proposal' && step.status === 'executed'),
    'Expected build_patch_proposal step.',
  );
  assert(
    result.steps.some((step) => step.id === 'build_diff_preview' && step.status === 'executed'),
    'Expected build_diff_preview step.',
  );

  const finalContentExists = await readOptionalFile(
    resolve(projectRoot, 'src/modules/auth/index.ts'),
  );

  assert(
    finalContentExists === undefined,
    'ScaffoldRunner must not write scaffold files directly.',
  );

  const reportRaw = await readFile(reportPath, 'utf8');

  assert(reportRaw.includes('"status": "patch_ready"'), 'Expected patch_ready report.');
  assert(reportRaw.includes('"patchProposal"'), 'Expected patch proposal in report.');
  assert(reportRaw.includes('"diffPreviews"'), 'Expected diff previews in report.');
  assert(
    !reportRaw.includes('sk-or-v1-should-not-leak'),
    'Scaffold report must not leak secret-looking values.',
  );

  const invalidIntentResult = await runner.run({
    projectRoot,
    intent: {
      kind: 'module',
      name: '../evil',
      moduleKind: 'backend',
      targetPath: '../outside',
      provider: 'fake-llm',
      allowRealProvider: false,
      allowPremium: false,
      premiumApproved: false,
      includeProjectMemory: false,
      overwriteExisting: false,
      dryRun: true,
    },
  });

  assert(
    invalidIntentResult.status === 'intent_invalid',
    'Expected invalid intent to be reported.',
  );
  assert(
    invalidIntentResult.failures.some((failure) => failure.includes('SCAFFOLD_NAME_DANGEROUS')),
    'Expected dangerous name failure.',
  );
  assert(
    invalidIntentResult.diffPreviews.length === 0,
    'Invalid intent must not produce diff previews.',
  );

  const unsafeRunner = new ScaffoldRunner({
    provider: new FakeModuleGeneratorProvider({
      mode: 'unsafe_path',
    }),
    reporter: new ScaffoldReporter({
      outputPath: reportPath,
    }),
  });

  const unsafeResult = await unsafeRunner.run({
    projectRoot,
    intent: {
      kind: 'module',
      name: 'billing',
      moduleKind: 'backend',
      targetPath: 'src/modules/billing',
      provider: 'fake-llm',
      allowRealProvider: false,
      allowPremium: false,
      premiumApproved: false,
      includeProjectMemory: false,
      overwriteExisting: false,
      dryRun: true,
    },
  });

  assert(
    unsafeResult.status === 'safety_failed',
    'Expected unsafe provider output to fail safety.',
  );
  assert(
    unsafeResult.safety.issues.some(
      (issue) => issue.code === 'SCAFFOLD_SAFETY_TARGET_ROOT_MISMATCH',
    ),
    'Expected target root mismatch safety issue.',
  );
  assert(
    unsafeResult.patchProposal === undefined,
    'Unsafe scaffold proposal must not produce patch proposal.',
  );
  assert(
    unsafeResult.diffPreviews.length === 0,
    'Unsafe scaffold proposal must not produce diff previews.',
  );

  const invalidSchemaRunner = new ScaffoldRunner({
    provider: new FakeModuleGeneratorProvider({
      mode: 'invalid_schema',
    }),
    reporter: new ScaffoldReporter({
      outputPath: reportPath,
    }),
  });

  const invalidSchemaResult = await invalidSchemaRunner.run({
    projectRoot,
    intent: {
      kind: 'module',
      name: 'reports',
      moduleKind: 'backend',
      targetPath: 'src/modules/reports',
      provider: 'fake-llm',
      allowRealProvider: false,
      allowPremium: false,
      premiumApproved: false,
      includeProjectMemory: false,
      overwriteExisting: false,
      dryRun: true,
    },
  });

  assert(
    invalidSchemaResult.status === 'proposal_invalid',
    'Expected invalid schema to fail before safety.',
  );
  assert(
    invalidSchemaResult.patchProposal === undefined,
    'Invalid schema must not produce patch proposal.',
  );
  assert(
    invalidSchemaResult.diffPreviews.length === 0,
    'Invalid schema must not produce diff previews.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'scaffold-runner-test',
        mainStatus: result.status,
        invalidIntentStatus: invalidIntentResult.status,
        unsafeStatus: unsafeResult.status,
        invalidSchemaStatus: invalidSchemaResult.status,
        operations: result.patchProposal?.operations.length ?? 0,
        diffPreviews: result.diffPreviews.length,
      },
      null,
      2,
    ),
  );
}

async function resetFixture(projectRoot: string): Promise<void> {
  await rm(resolve('.runtime/scaffold-runner-test'), {
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
        name: 'scaffold-runner-fixture',
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

async function readOptionalFile(targetPath: string): Promise<string | undefined> {
  try {
    return await readFile(targetPath, 'utf8');
  } catch {
    return undefined;
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'scaffold-runner-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
