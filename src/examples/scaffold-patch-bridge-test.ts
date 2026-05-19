import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ScaffoldIntentParser } from '../scaffold/ScaffoldIntentParser.js';
import { FakeModuleGeneratorProvider } from '../scaffold/ModuleGeneratorProvider.js';
import { ScaffoldPatchBridge } from '../scaffold/ScaffoldPatchBridge.js';
import { ScaffoldProposalParser } from '../scaffold/ScaffoldProposalParser.js';
import { ScaffoldRequestBuilder } from '../scaffold/ScaffoldRequestBuilder.js';
import { ScaffoldSafetyValidator } from '../scaffold/ScaffoldSafetyValidator.js';
import type {
  ScaffoldIntent,
  ScaffoldIntentParseResult,
  ScaffoldProjectConvention,
  ScaffoldProposal,
  ScaffoldProposalParseResult,
  ScaffoldRequest,
} from '../scaffold/ScaffoldTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const projectRoot = resolve('.runtime/scaffold-patch-bridge-test/project');

  await resetFixture(projectRoot);

  const request = createRequest(projectRoot, {
    targetPath: 'src/modules/auth',
    overwriteExisting: false,
  });

  const proposal = await createProposal(request);

  const safety = await new ScaffoldSafetyValidator().validate({
    request,
    proposal,
  });

  assert(safety.safe, 'Expected scaffold proposal to be safe before bridge.');

  const patchProposal = await new ScaffoldPatchBridge().toPatchProposal({
    request,
    proposal,
  });

  assert(
    patchProposal.id === `patch-from-${proposal.id}`,
    'Expected patch proposal id derived from scaffold proposal.',
  );
  assert(patchProposal.summary === proposal.summary, 'Expected summary to be preserved.');
  assert(patchProposal.riskLevel === proposal.riskLevel, 'Expected risk level to be preserved.');
  assert(
    patchProposal.operations.length === proposal.files.length,
    'Expected one patch operation per scaffold file.',
  );
  assert(
    patchProposal.operations.every((operation) => operation.kind === 'create_file'),
    'Expected create_file operations.',
  );
  assert(
    patchProposal.operations.every((operation) => typeof operation.newContent === 'string'),
    'Expected every operation to include newContent.',
  );
  assert(
    patchProposal.operations.every((operation) => operation.expectedCurrentContent === undefined),
    'Expected create_file operations not to include expectedCurrentContent.',
  );
  assert(
    patchProposal.operations.some(
      (operation) => operation.targetFile === 'src/modules/auth/index.ts',
    ),
    'Expected index.ts patch operation.',
  );
  assert(
    patchProposal.explanation.includes('Generated from a validated scaffold proposal.'),
    'Expected scaffold provenance in explanation.',
  );
  assert(
    patchProposal.explanation.includes('PatchApplyRunner'),
    'Expected runtime gate reminder in explanation.',
  );

  const overwriteRequest = createRequest(projectRoot, {
    targetPath: 'src/modules/auth',
    overwriteExisting: true,
  });

  const replaceProposal: ScaffoldProposal = {
    ...proposal,
    files: [
      {
        kind: 'replace_file',
        targetFile: 'src/modules/auth/existing.ts',
        content: 'export const existing = false;\n',
        reason: 'Replace existing fixture file.',
      },
    ],
  };

  const replaceSafety = await new ScaffoldSafetyValidator().validate({
    request: overwriteRequest,
    proposal: replaceProposal,
  });

  assert(replaceSafety.safe, 'Expected replace proposal with overwrite opt-in to be safe.');

  const replacePatch = await new ScaffoldPatchBridge().toPatchProposal({
    request: overwriteRequest,
    proposal: replaceProposal,
  });

  const replaceOperation = requireFirstOperation(replacePatch.operations);

  assert(replaceOperation.kind === 'replace_file', 'Expected replace_file operation.');
  assert(
    replaceOperation.expectedCurrentContent === 'export const existing = true;\n',
    'Expected current file content to be captured for replace_file.',
  );
  assert(
    replaceOperation.newContent === 'export const existing = false;\n',
    'Expected replacement content.',
  );

  const finalContent = await readFile(resolve(projectRoot, 'src/modules/auth/existing.ts'), 'utf8');

  assert(
    finalContent === 'export const existing = true;\n',
    'ScaffoldPatchBridge must not modify files.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'scaffold-patch-bridge-test',
        operations: patchProposal.operations.length,
        replaceExpectedContentCaptured:
          replaceOperation.expectedCurrentContent === 'export const existing = true;\n',
      },
      null,
      2,
    ),
  );
}

function requireFirstOperation<T>(operations: readonly T[]): T {
  const first = operations[0];

  if (first === undefined) {
    throw new Error('Expected at least one operation.');
  }

  return first;
}

async function createProposal(request: ScaffoldRequest): Promise<ScaffoldProposal> {
  const raw = await new FakeModuleGeneratorProvider({
    mode: 'markdown_json',
  }).generate({
    request,
  });

  return requireProposal(new ScaffoldProposalParser().parse(raw.rawOutput));
}

function createRequest(
  projectRoot: string,
  input: {
    targetPath: string;
    overwriteExisting: boolean;
  },
): ScaffoldRequest {
  const intent = requireIntent(
    new ScaffoldIntentParser().parse({
      kind: 'module',
      name: 'auth',
      moduleKind: 'backend',
      targetPath: input.targetPath,
      provider: 'fake-llm',
      allowRealProvider: false,
      allowPremium: false,
      premiumApproved: false,
      includeProjectMemory: false,
      overwriteExisting: input.overwriteExisting,
      dryRun: true,
    }),
  );

  const convention: ScaffoldProjectConvention = {
    projectRoot,
    detectedStack: ['node', 'typescript'],
    packageManager: 'npm',
    hasTypeScript: true,
    hasSrcDirectory: true,
    hasPackageJson: true,
    hasTsConfig: true,
    preferredSourceRoot: 'src',
    moduleRootHint: 'src/modules',
    testRootHint: 'tests',
  };

  return new ScaffoldRequestBuilder().build({
    projectRoot,
    intent,
    convention,
  });
}

function requireIntent(result: ScaffoldIntentParseResult): ScaffoldIntent {
  if (!result.ok) {
    throw new Error(`Expected valid scaffold intent: ${JSON.stringify(result.issues, null, 2)}`);
  }

  return result.intent;
}

function requireProposal(result: ScaffoldProposalParseResult): ScaffoldProposal {
  if (!result.ok) {
    throw new Error(
      `Expected valid scaffold proposal: ${JSON.stringify(result.validation.issues, null, 2)}`,
    );
  }

  return result.proposal;
}

async function resetFixture(projectRoot: string): Promise<void> {
  await rm(resolve('.runtime/scaffold-patch-bridge-test'), {
    recursive: true,
    force: true,
  });

  await mkdir(resolve(projectRoot, 'src/modules/auth'), {
    recursive: true,
  });

  await writeFile(
    resolve(projectRoot, 'src/modules/auth/existing.ts'),
    'export const existing = true;\n',
    'utf8',
  );
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'scaffold-patch-bridge-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
