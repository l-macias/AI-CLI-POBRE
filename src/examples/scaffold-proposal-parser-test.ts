import { ScaffoldIntentParser } from '../scaffold/ScaffoldIntentParser.js';
import { FakeModuleGeneratorProvider } from '../scaffold/ModuleGeneratorProvider.js';
import { ScaffoldProposalParser } from '../scaffold/ScaffoldProposalParser.js';
import type {
  ModuleGeneratorProviderResult,
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
  const request = createRequest();
  const parser = new ScaffoldProposalParser();

  const markdownProvider = new FakeModuleGeneratorProvider({
    mode: 'markdown_json',
  });

  const markdownResult = await markdownProvider.generate({
    request,
  });

  const markdownProposal = requireParsedProposal(
    parser.parse(markdownResult.rawOutput),
    'Expected markdown JSON scaffold proposal to parse.',
  );

  assert(markdownProposal.moduleName === 'auth', 'Expected module name.');
  assert(markdownProposal.moduleKind === 'backend', 'Expected module kind.');
  assert(markdownProposal.targetRoot === 'src/modules/auth', 'Expected target root.');
  assert(markdownProposal.files.length === 3, 'Expected three generated files.');
  assert(
    markdownProposal.files.every((file) => file.kind === 'create_file'),
    'Expected create_file operations.',
  );
  assert(
    markdownProposal.files.some((file) => file.targetFile.endsWith('/index.ts')),
    'Expected index.ts file.',
  );

  const jsonProvider = new FakeModuleGeneratorProvider({
    mode: 'json_only',
  });

  const jsonResult = await jsonProvider.generate({
    request,
  });

  const jsonProposal = requireParsedProposal(
    parser.parse(jsonResult.rawOutput),
    'Expected raw JSON scaffold proposal to parse.',
  );

  assert(jsonProposal.files.length === 3, 'Expected raw JSON files.');

  const invalidJsonProvider = new FakeModuleGeneratorProvider({
    mode: 'invalid_json',
  });

  const invalidJsonResult = await invalidJsonProvider.generate({
    request,
  });

  const invalidJsonIssues = requireFailedParse(
    parser.parse(invalidJsonResult.rawOutput),
    'Expected invalid JSON to fail.',
  );

  assert(
    hasIssue(invalidJsonIssues, 'SCAFFOLD_PROPOSAL_JSON_NOT_FOUND') ||
      hasIssue(invalidJsonIssues, 'SCAFFOLD_PROPOSAL_JSON_INVALID'),
    'Expected invalid JSON issue.',
  );

  const invalidSchemaProvider = new FakeModuleGeneratorProvider({
    mode: 'invalid_schema',
  });

  const invalidSchemaResult = await invalidSchemaProvider.generate({
    request,
  });

  const invalidSchemaIssues = requireFailedParse(
    parser.parse(invalidSchemaResult.rawOutput),
    'Expected invalid schema to fail.',
  );

  assert(
    hasIssue(invalidSchemaIssues, 'SCAFFOLD_PROPOSAL_FILES_INVALID'),
    'Expected invalid files schema issue.',
  );

  const unsafePathProvider = new FakeModuleGeneratorProvider({
    mode: 'unsafe_path',
  });

  const unsafePathResult = await unsafePathProvider.generate({
    request,
  });

  const unsafePathProposal = requireParsedProposal(
    parser.parse(unsafePathResult.rawOutput),
    'Unsafe path proposal should parse at schema stage. Safety validator blocks it later.',
  );

  assert(
    unsafePathProposal.targetRoot === '../outside',
    'Expected unsafe target root to remain visible for safety validator.',
  );

  assertProviderMetadata(markdownResult);

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'scaffold-proposal-parser-test',
        files: markdownProposal.files.length,
        provider: markdownResult.provider,
        model: markdownResult.model,
      },
      null,
      2,
    ),
  );
}

function createRequest(): ScaffoldRequest {
  const intent = requireIntent(
    new ScaffoldIntentParser().parse({
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
    }),
  );

  const convention: ScaffoldProjectConvention = {
    projectRoot: '/tmp/scaffold-proposal-parser-test',
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

  const createdAt = new Date().toISOString();

  return {
    id: `scaffold-request-test-${createdAt.replaceAll(':', '').replaceAll('.', '')}`,
    projectRoot: convention.projectRoot,
    objective: 'Create auth module.',
    intent,
    convention,
    constraints: [],
    expectedOutput: {
      format: 'json_scaffold_proposal',
      requireFileTree: true,
      requireExplanation: true,
      requireRiskAssessment: true,
      allowedOperations: ['create_file', 'replace_file'],
    },
    createdAt,
  };
}

function requireIntent(result: ScaffoldIntentParseResult): ScaffoldIntent {
  if (!result.ok) {
    throw new Error(`Expected valid scaffold intent: ${JSON.stringify(result.issues, null, 2)}`);
  }

  return result.intent;
}

function requireParsedProposal(
  result: ScaffoldProposalParseResult,
  message: string,
): ScaffoldProposal {
  if (!result.ok) {
    throw new Error(`${message} Issues: ${JSON.stringify(result.validation.issues, null, 2)}`);
  }

  return result.proposal;
}

function requireFailedParse(
  result: ScaffoldProposalParseResult,
  message: string,
): readonly ScaffoldProposalValidationIssue[] {
  if (result.ok) {
    throw new Error(
      `${message} Proposal unexpectedly parsed: ${JSON.stringify(result.proposal, null, 2)}`,
    );
  }

  return result.validation.issues;
}

function hasIssue(
  issues: readonly {
    code: string;
  }[],
  code: string,
): boolean {
  return issues.some((issue) => issue.code === code);
}

function assertProviderMetadata(result: ModuleGeneratorProviderResult): void {
  assert(result.provider === 'fake-llm', 'Expected fake provider metadata.');
  assert(result.model === 'fake-scaffold-model', 'Expected fake model metadata.');
  assert(typeof result.createdAt === 'string', 'Expected createdAt metadata.');
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'scaffold-proposal-parser-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
