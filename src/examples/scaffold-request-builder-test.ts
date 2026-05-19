import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ScaffoldIntentParser } from '../scaffold/ScaffoldIntentParser.js';
import { ScaffoldProjectConventionReader } from '../scaffold/ScaffoldProjectConventionReader.js';
import { ScaffoldRequestBuilder } from '../scaffold/ScaffoldRequestBuilder.js';
import type { ScaffoldIntent, ScaffoldIntentParseResult } from '../scaffold/ScaffoldTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const projectRoot = resolve('.runtime/scaffold-request-builder-test/project');

  await resetFixture(projectRoot);

  const parser = new ScaffoldIntentParser();
  const intent = requireIntent(
    parser.parse({
      kind: 'module',
      name: 'Auth',
      moduleKind: 'backend',
      targetPath: 'src/modules/auth',
      provider: 'fake-llm',
      allowRealProvider: false,
      allowPremium: false,
      premiumApproved: false,
      includeProjectMemory: true,
      overwriteExisting: false,
      dryRun: true,
    }),
  );

  const convention = await new ScaffoldProjectConventionReader().read({
    projectRoot,
  });

  assert(convention.projectRoot === projectRoot, 'Expected convention project root.');
  assert(convention.hasPackageJson, 'Expected package.json detection.');
  assert(convention.hasTsConfig, 'Expected tsconfig detection.');
  assert(convention.hasSrcDirectory, 'Expected src directory detection.');
  assert(convention.hasTypeScript, 'Expected TypeScript detection.');
  assert(convention.packageManager === 'npm', 'Expected npm package manager from lockfile.');
  assert(convention.detectedStack.includes('node'), 'Expected node stack detection.');
  assert(convention.detectedStack.includes('typescript'), 'Expected TypeScript stack detection.');
  assert(convention.detectedStack.includes('express'), 'Expected express stack detection.');
  assert(convention.moduleRootHint === 'src/modules', 'Expected module root hint.');
  assert(convention.testRootHint === 'tests', 'Expected test root hint.');

  const request = new ScaffoldRequestBuilder().build({
    projectRoot,
    intent,
    convention,
  });

  assert(request.projectRoot === projectRoot, 'Expected request project root.');
  assert(request.intent.normalizedName === 'auth', 'Expected normalized intent name.');
  assert(
    request.intent.normalizedTargetPath === 'src/modules/auth',
    'Expected normalized target path.',
  );
  assert(
    request.objective.includes('Scaffold backend module "auth"'),
    'Expected generated objective.',
  );
  assert(
    request.expectedOutput.format === 'json_scaffold_proposal',
    'Expected scaffold proposal output format.',
  );
  assert(request.expectedOutput.requireFileTree, 'Expected file tree requirement.');
  assert(request.expectedOutput.requireExplanation, 'Expected explanation requirement.');
  assert(request.expectedOutput.requireRiskAssessment, 'Expected risk assessment requirement.');
  assert(
    request.expectedOutput.allowedOperations.includes('create_file'),
    'Expected create_file operation.',
  );
  assert(
    request.expectedOutput.allowedOperations.includes('replace_file'),
    'Expected replace_file operation.',
  );
  assert(
    request.constraints.some((constraint) => constraint.code === 'SCAFFOLD_NO_DIRECT_WRITES'),
    'Expected no direct writes constraint.',
  );
  assert(
    request.constraints.some(
      (constraint) => constraint.code === 'SCAFFOLD_NO_OVERWRITE_WITHOUT_OPT_IN',
    ),
    'Expected no overwrite constraint.',
  );
  assert(
    request.constraints.some((constraint) => constraint.code === 'SCAFFOLD_TYPESCRIPT_STRICT'),
    'Expected TypeScript strict constraint.',
  );

  const openRouterIntent = requireIntent(
    parser.parse({
      kind: 'module',
      name: 'Billing',
      moduleKind: 'backend',
      targetPath: 'src/modules/billing',
      provider: 'openrouter',
      providerModel: 'poolside/laguna-xs.2:free',
      allowRealProvider: true,
      allowPremium: false,
      premiumApproved: false,
      includeProjectMemory: false,
      overwriteExisting: true,
      dryRun: true,
    }),
  );

  const openRouterRequest = new ScaffoldRequestBuilder().build({
    projectRoot,
    intent: openRouterIntent,
    convention,
    objective: 'Create a billing module proposal only.',
  });

  assert(
    openRouterRequest.objective === 'Create a billing module proposal only.',
    'Expected explicit objective to be preserved.',
  );
  assert(
    openRouterRequest.constraints.some(
      (constraint) => constraint.code === 'SCAFFOLD_PROVIDER_NOT_AUTHORITY',
    ),
    'Expected provider-not-authority constraint for OpenRouter.',
  );
  assert(
    !openRouterRequest.constraints.some(
      (constraint) => constraint.code === 'SCAFFOLD_NO_OVERWRITE_WITHOUT_OPT_IN',
    ),
    'Overwrite opt-in should omit no-overwrite constraint.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'scaffold-request-builder-test',
        detectedStack: convention.detectedStack,
        packageManager: convention.packageManager,
        moduleRootHint: convention.moduleRootHint,
        testRootHint: convention.testRootHint,
        constraints: request.constraints.length,
      },
      null,
      2,
    ),
  );
}

function requireIntent(result: ScaffoldIntentParseResult): ScaffoldIntent {
  if (!result.ok) {
    throw new Error(`Expected valid scaffold intent: ${JSON.stringify(result.issues, null, 2)}`);
  }

  return result.intent;
}

async function resetFixture(projectRoot: string): Promise<void> {
  await rm(resolve('.runtime/scaffold-request-builder-test'), {
    recursive: true,
    force: true,
  });

  await mkdir(resolve(projectRoot, 'src/modules'), {
    recursive: true,
  });

  await mkdir(resolve(projectRoot, 'tests'), {
    recursive: true,
  });

  await writeFile(
    resolve(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'scaffold-request-builder-fixture',
        dependencies: {
          express: '^5.0.0',
        },
        devDependencies: {
          typescript: '^5.7.2',
          vitest: '^2.0.0',
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
        test: 'scaffold-request-builder-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
