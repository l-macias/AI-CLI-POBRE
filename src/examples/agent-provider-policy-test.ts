import { AgentProviderAuditReporter } from '../agent/AgentProviderAuditReporter.js';
import { AgentProviderPolicy } from '../agent/AgentProviderPolicy.js';
import type { AgentProviderConfig } from '../agent/AgentProviderConfig.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const policy = new AgentProviderPolicy({
  defaultEstimatedCompletionTokens: 1200,
  maxEstimatedCompletionTokens: 8000,
  knownPremiumModelFragments: ['premium-model', 'gpt-5', 'claude'],
});

const fakeConfig: AgentProviderConfig = {
  provider: 'fake-llm',
  fakeProviderMode: 'markdown_json',
  allowRealProvider: false,
  allowPremium: false,
  premiumApproved: false,
  includeProjectMemory: true,
};

const fakeDecision = policy.evaluate(fakeConfig);

assert(fakeDecision.allowed, 'Fake provider should be allowed without real provider opt-in.');
assert(fakeDecision.status === 'allowed', 'Fake provider policy status should be allowed.');
assert(fakeDecision.provider === 'fake-llm', 'Fake provider decision should preserve provider.');
assert(
  fakeDecision.estimatedCompletionTokens === 1200,
  'Fake provider should receive safe default estimated completion tokens.',
);
assert(fakeDecision.issues.length === 0, 'Fake provider should not produce policy issues.');

const staticConfig: AgentProviderConfig = {
  provider: 'static',
  fakeProviderMode: 'markdown_json',
  allowRealProvider: false,
  allowPremium: false,
  premiumApproved: false,
  includeProjectMemory: false,
};

const staticDecision = policy.evaluate(staticConfig);

assert(staticDecision.allowed, 'Static provider should be allowed without real provider opt-in.');
assert(staticDecision.provider === 'static', 'Static provider decision should preserve provider.');

const openRouterNoOptIn: AgentProviderConfig = {
  provider: 'openrouter',
  fakeProviderMode: 'markdown_json',
  providerModel: 'poolside/laguna-xs.2:free',
  estimatedCompletionTokens: 1200,
  allowRealProvider: false,
  allowPremium: false,
  premiumApproved: false,
  includeProjectMemory: false,
};

const openRouterNoOptInDecision = policy.evaluate(openRouterNoOptIn);

assert(!openRouterNoOptInDecision.allowed, 'OpenRouter must be blocked without opt-in.');
assert(
  openRouterNoOptInDecision.issues.some(
    (issue) => issue.code === 'AGENT_PROVIDER_REAL_PROVIDER_OPT_IN_REQUIRED',
  ),
  'OpenRouter without opt-in should produce opt-in issue.',
);

const openRouterMemoryOnly: AgentProviderConfig = {
  ...openRouterNoOptIn,
  includeProjectMemory: true,
};

const openRouterMemoryOnlyDecision = policy.evaluate(openRouterMemoryOnly);

assert(!openRouterMemoryOnlyDecision.allowed, 'Project memory must not authorize OpenRouter.');
assert(
  openRouterMemoryOnlyDecision.issues.some(
    (issue) => issue.code === 'AGENT_PROVIDER_MEMORY_DOES_NOT_AUTHORIZE_REAL_PROVIDER',
  ),
  'Memory-only OpenRouter config should produce memory authorization issue.',
);

const openRouterMissingModel: AgentProviderConfig = {
  provider: 'openrouter',
  fakeProviderMode: 'markdown_json',
  allowRealProvider: true,
  allowPremium: false,
  premiumApproved: false,
  includeProjectMemory: false,
};

const openRouterMissingModelDecision = policy.evaluate(openRouterMissingModel);

assert(!openRouterMissingModelDecision.allowed, 'OpenRouter should require provider model.');
assert(
  openRouterMissingModelDecision.issues.some(
    (issue) => issue.code === 'AGENT_PROVIDER_MODEL_REQUIRED',
  ),
  'OpenRouter without model should produce model-required issue.',
);

const openRouterFreeModel: AgentProviderConfig = {
  provider: 'openrouter',
  fakeProviderMode: 'markdown_json',
  providerModel: 'poolside/laguna-xs.2:free',
  estimatedCompletionTokens: 1200,
  allowRealProvider: true,
  allowPremium: false,
  premiumApproved: false,
  includeProjectMemory: true,
};

const openRouterFreeModelDecision = policy.evaluate(openRouterFreeModel);

assert(openRouterFreeModelDecision.allowed, 'OpenRouter free model should be allowed with opt-in.');
assert(
  openRouterFreeModelDecision.provider === 'openrouter',
  'OpenRouter decision should preserve provider.',
);
assert(
  openRouterFreeModelDecision.providerModel === 'poolside/laguna-xs.2:free',
  'OpenRouter decision should preserve model.',
);

const openRouterPremiumNoApproval: AgentProviderConfig = {
  provider: 'openrouter',
  fakeProviderMode: 'markdown_json',
  providerModel: 'provider/premium-model',
  estimatedCompletionTokens: 1200,
  allowRealProvider: true,
  allowPremium: false,
  premiumApproved: false,
  includeProjectMemory: false,
};

const openRouterPremiumNoApprovalDecision = policy.evaluate(openRouterPremiumNoApproval);

assert(
  !openRouterPremiumNoApprovalDecision.allowed,
  'Premium-like model should require premium flags.',
);
assert(
  openRouterPremiumNoApprovalDecision.issues.some(
    (issue) => issue.code === 'AGENT_PROVIDER_PREMIUM_NOT_ALLOWED',
  ),
  'Premium-like model should require allowPremium.',
);
assert(
  openRouterPremiumNoApprovalDecision.issues.some(
    (issue) => issue.code === 'AGENT_PROVIDER_PREMIUM_APPROVAL_REQUIRED',
  ),
  'Premium-like model should require premiumApproved.',
);

const openRouterPremiumApproved: AgentProviderConfig = {
  ...openRouterPremiumNoApproval,
  allowPremium: true,
  premiumApproved: true,
};

const openRouterPremiumApprovedDecision = policy.evaluate(openRouterPremiumApproved);

assert(
  openRouterPremiumApprovedDecision.allowed,
  'Premium-like model should pass with both premium flags.',
);

const tooLargeBudget: AgentProviderConfig = {
  provider: 'openrouter',
  fakeProviderMode: 'markdown_json',
  providerModel: 'poolside/laguna-xs.2:free',
  estimatedCompletionTokens: 20_000,
  allowRealProvider: true,
  allowPremium: false,
  premiumApproved: false,
  includeProjectMemory: false,
};

const tooLargeBudgetDecision = policy.evaluate(tooLargeBudget);

assert(!tooLargeBudgetDecision.allowed, 'Too-large estimated completion budget should be blocked.');
assert(
  tooLargeBudgetDecision.issues.some(
    (issue) => issue.code === 'AGENT_PROVIDER_TOKEN_BUDGET_EXCEEDED',
  ),
  'Too-large budget should produce token budget issue.',
);

const audit = new AgentProviderAuditReporter().toMetadata({
  source: 'agent-provider-policy-test',
  config: openRouterNoOptIn,
  decision: openRouterNoOptInDecision,
});

assert(audit['provider'] === 'openrouter', 'Audit metadata should include requested provider.');
assert(audit['selectedProvider'] === 'fake-llm', 'Blocked audit should select fallback provider.');
assert(audit['policyStatus'] === 'blocked', 'Audit metadata should include blocked status.');
assert(audit['policyAllowed'] === false, 'Audit metadata should include allowed=false.');
assert(audit['fallbackReason'] !== undefined, 'Blocked audit should include fallback reason.');
assert(
  audit['issueCount'] === openRouterNoOptInDecision.issues.length,
  'Audit should include issue count.',
);

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'agent-provider-policy-test',
      checked: {
        fake: fakeDecision.status,
        static: staticDecision.status,
        openRouterNoOptIn: openRouterNoOptInDecision.status,
        openRouterFreeModel: openRouterFreeModelDecision.status,
        premiumApproved: openRouterPremiumApprovedDecision.status,
        tooLargeBudget: tooLargeBudgetDecision.status,
      },
    },
    null,
    2,
  ),
);
