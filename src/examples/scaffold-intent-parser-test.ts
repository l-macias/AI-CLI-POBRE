import { ScaffoldIntentParser } from '../scaffold/ScaffoldIntentParser.js';
import type {
  ScaffoldIntent,
  ScaffoldIntentIssue,
  ScaffoldIntentParseResult,
} from '../scaffold/ScaffoldTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const parser = new ScaffoldIntentParser();

const valid = requireOk(
  parser.parse({
    kind: 'module',
    name: 'Auth Module',
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
  'Expected valid scaffold intent.',
);

assert(valid.kind === 'module', 'Expected module scaffold intent.');
assert(valid.name === 'Auth Module', 'Expected original name to be preserved.');
assert(valid.normalizedName === 'auth-module', 'Expected normalized module name.');
assert(valid.moduleKind === 'backend', 'Expected backend module kind.');
assert(valid.normalizedTargetPath === 'src/modules/auth', 'Expected normalized target path.');
assert(valid.provider === 'fake-llm', 'Expected fake provider.');
assert(valid.includeProjectMemory === true, 'Expected memory flag.');
assert(valid.dryRun === true, 'Expected dry-run flag.');

const backslashTarget = requireOk(
  parser.parse({
    kind: 'module',
    name: 'Billing',
    moduleKind: 'frontend',
    targetPath: '.\\src\\modules\\billing\\',
    provider: 'fake-llm',
    allowRealProvider: false,
    allowPremium: false,
    premiumApproved: false,
    includeProjectMemory: false,
    overwriteExisting: false,
    dryRun: true,
  }),
  'Expected Windows-style target path to parse.',
);

assert(
  backslashTarget.normalizedTargetPath === 'src/modules/billing',
  'Expected Windows-style target path normalization.',
);

const traversalNameIssues = requireFail(
  parser.parse({
    kind: 'module',
    name: '../evil',
    moduleKind: 'backend',
    targetPath: 'src/modules/evil',
    provider: 'fake-llm',
    allowRealProvider: false,
    allowPremium: false,
    premiumApproved: false,
    includeProjectMemory: false,
    overwriteExisting: false,
    dryRun: true,
  }),
  'Expected traversal module name to be rejected.',
);

assert(hasIssue(traversalNameIssues, 'SCAFFOLD_NAME_DANGEROUS'), 'Expected dangerous name issue.');

const traversalTargetIssues = requireFail(
  parser.parse({
    kind: 'module',
    name: 'evil',
    moduleKind: 'backend',
    targetPath: '../outside',
    provider: 'fake-llm',
    allowRealProvider: false,
    allowPremium: false,
    premiumApproved: false,
    includeProjectMemory: false,
    overwriteExisting: false,
    dryRun: true,
  }),
  'Expected traversal target path to be rejected.',
);

assert(
  hasIssue(traversalTargetIssues, 'SCAFFOLD_TARGET_TRAVERSAL_BLOCKED'),
  'Expected traversal target path issue.',
);

const protectedTargetIssues = requireFail(
  parser.parse({
    kind: 'module',
    name: 'env',
    moduleKind: 'backend',
    targetPath: '.env',
    provider: 'fake-llm',
    allowRealProvider: false,
    allowPremium: false,
    premiumApproved: false,
    includeProjectMemory: false,
    overwriteExisting: false,
    dryRun: true,
  }),
  'Expected protected target path to be rejected.',
);

assert(
  hasIssue(protectedTargetIssues, 'SCAFFOLD_TARGET_PROTECTED_PATH_BLOCKED'),
  'Expected protected target path issue.',
);

const openRouterNoOptInIssues = requireFail(
  parser.parse({
    kind: 'module',
    name: 'auth',
    moduleKind: 'backend',
    targetPath: 'src/modules/auth',
    provider: 'openrouter',
    providerModel: 'poolside/laguna-xs.2:free',
    allowRealProvider: false,
    allowPremium: false,
    premiumApproved: false,
    includeProjectMemory: false,
    overwriteExisting: false,
    dryRun: true,
  }),
  'Expected OpenRouter scaffold intent without opt-in to fail.',
);

assert(
  hasIssue(openRouterNoOptInIssues, 'SCAFFOLD_REAL_PROVIDER_OPT_IN_REQUIRED'),
  'Expected OpenRouter opt-in issue.',
);

const openRouterMissingModelIssues = requireFail(
  parser.parse({
    kind: 'module',
    name: 'auth',
    moduleKind: 'backend',
    targetPath: 'src/modules/auth',
    provider: 'openrouter',
    allowRealProvider: true,
    allowPremium: false,
    premiumApproved: false,
    includeProjectMemory: false,
    overwriteExisting: false,
    dryRun: true,
  }),
  'Expected OpenRouter scaffold intent without model to fail.',
);

assert(
  hasIssue(openRouterMissingModelIssues, 'SCAFFOLD_PROVIDER_MODEL_REQUIRED'),
  'Expected OpenRouter provider model issue.',
);

const openRouterAllowed = requireOk(
  parser.parse({
    kind: 'module',
    name: 'auth',
    moduleKind: 'backend',
    targetPath: 'src/modules/auth',
    provider: 'openrouter',
    providerModel: 'poolside/laguna-xs.2:free',
    allowRealProvider: true,
    allowPremium: false,
    premiumApproved: false,
    includeProjectMemory: true,
    overwriteExisting: false,
    dryRun: true,
  }),
  'Expected OpenRouter scaffold intent with opt-in and model to pass.',
);

assert(openRouterAllowed.provider === 'openrouter', 'Expected OpenRouter provider.');
assert(
  openRouterAllowed.providerModel === 'poolside/laguna-xs.2:free',
  'Expected OpenRouter model.',
);
assert(openRouterAllowed.allowRealProvider === true, 'Expected real provider opt-in.');

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'scaffold-intent-parser-test',
      checked: {
        valid: true,
        backslashTarget: true,
        traversalName: false,
        traversalTarget: false,
        protectedTarget: false,
        openRouterNoOptIn: false,
        openRouterMissingModel: false,
        openRouterAllowed: true,
      },
    },
    null,
    2,
  ),
);

function requireOk(result: ScaffoldIntentParseResult, message: string): ScaffoldIntent {
  if (!result.ok) {
    throw new Error(`${message} Issues: ${JSON.stringify(result.issues, null, 2)}`);
  }

  return result.intent;
}

function requireFail(
  result: ScaffoldIntentParseResult,
  message: string,
): readonly ScaffoldIntentIssue[] {
  if (result.ok) {
    throw new Error(`${message} Intent unexpectedly parsed: ${JSON.stringify(result.intent)}`);
  }

  return result.issues;
}

function hasIssue(issues: readonly ScaffoldIntentIssue[], code: string): boolean {
  return issues.some((issue) => issue.code === code);
}
