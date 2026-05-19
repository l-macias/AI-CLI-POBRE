import { ModelBudgetController } from '../providers/ModelBudgetController.js';
import { ModelPricingCatalog } from '../providers/ModelPricingCatalog.js';
import { ProviderStrategy } from '../providers/ProviderStrategy.js';
import { FakeLlmRepairProposalProvider } from '../repair/FakeLlmRepairProposalProvider.js';
import { PolicyAwareRepairProposalProvider } from '../repair/PolicyAwareRepairProposalProvider.js';
import { RepairCostEstimator } from '../repair/RepairCostEstimator.js';
import { RepairModelPolicy } from '../repair/RepairModelPolicy.js';
import { RepairPromptBuilder } from '../repair/RepairPromptBuilder.js';
import { RepairRequestBuilder } from '../repair/RepairRequestBuilder.js';
import { StaticRepairProposalProvider } from '../repair/StaticRepairProposalProvider.js';
import type { PatchProposal, RepairTargetFile } from '../types/RepairTypes.js';
import type { ProviderStrategyConfig } from '../types/ProviderStrategyTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const targetFile: RepairTargetFile = {
  relativePath: 'src/example.ts',
  exists: true,
  content: 'export const value = 1;\n',
  bytes: 'export const value = 1;\n'.length,
};

const request = new RepairRequestBuilder().build({
  objective: 'Fix example file.',
  projectRoot: '/tmp/zero-policy-aware-test',
  targetFiles: [targetFile],
  findings: [
    {
      id: 'finding-1',
      source: 'typescript-direct',
      message: 'Example finding.',
      relatedFile: targetFile.relativePath,
      line: 1,
      column: 1,
      severity: 'error',
    },
  ],
});

const prompt = new RepairPromptBuilder().build(request);

const fakeProvider = new FakeLlmRepairProposalProvider({
  mode: 'text_around_json',
  proposalFactory: (): PatchProposal => {
    return {
      id: 'policy-aware-fake-proposal',
      summary: 'Policy-aware fake proposal.',
      riskLevel: 'low',
      operations: [
        {
          kind: 'replace_file',
          targetFile: targetFile.relativePath,
          expectedCurrentContent: targetFile.content,
          newContent: 'export const value = 2;\n',
          reason: 'Test policy-aware primary provider.',
        },
      ],
      explanation: 'Fake provider used after policy allowed it.',
    };
  },
});

const fallbackProposal: PatchProposal = {
  id: 'policy-aware-static-fallback',
  summary: 'Static fallback proposal.',
  riskLevel: 'low',
  operations: [],
  explanation: 'Fallback used because policy blocked primary provider.',
};

const staticFallback = new StaticRepairProposalProvider(fallbackProposal);

const allowedProvider = new PolicyAwareRepairProposalProvider({
  provider: 'fake-llm',
  primary: fakeProvider,
  fallback: staticFallback,
});

const allowedResult = await allowedProvider.propose({
  request,
  prompt,
});

assert(allowedResult.proposal.id === 'policy-aware-fake-proposal', 'Expected primary proposal.');
assert(allowedResult.modelPolicyDecision?.allowed === true, 'Expected policy allowed decision.');
assert(allowedResult.providerFallbackUsed === false, 'Expected no fallback when policy allows.');

const expensivePricingCatalog = new ModelPricingCatalog({
  pricing: [
    {
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      tier: 'cheap',
      inputUsdPerMillionTokens: 10_000,
      outputUsdPerMillionTokens: 10_000,
    },
  ],
});

const blockedPolicy = new RepairModelPolicy({
  estimator: new RepairCostEstimator({
    pricingCatalog: expensivePricingCatalog,
  }),
  strategy: new ProviderStrategy({
    config: createPaidRepairStrategy(),
  }),
  budgetController: new ModelBudgetController({
    pricingCatalog: expensivePricingCatalog,
  }),
});

const blockedProvider = new PolicyAwareRepairProposalProvider({
  provider: 'openrouter',
  primary: fakeProvider,
  fallback: staticFallback,
  policy: blockedPolicy,
  estimatedCompletionTokens: 2_000,
});

const blockedResult = await blockedProvider.propose({
  request,
  prompt: `${prompt}\n${'large-context\n'.repeat(500)}`,
});

assert(blockedResult.proposal.id === 'policy-aware-static-fallback', 'Expected fallback proposal.');
assert(blockedResult.modelPolicyDecision?.allowed === false, 'Expected blocked policy decision.');
assert(blockedResult.providerFallbackUsed === true, 'Expected fallback when policy blocks.');
const blockedDecision = blockedResult.modelPolicyDecision;

if (blockedDecision === undefined) {
  throw new Error('Expected blocked model policy decision.');
}

assert(
  blockedDecision.issues.some((issue) => issue.code === 'ESTIMATED_COST_BUDGET_EXCEEDED'),
  'Expected cost budget issue.',
);

console.log(
  JSON.stringify(
    {
      message: 'Policy-aware repair provider test completed',
      allowed: {
        proposalId: allowedResult.proposal.id,
        policy: allowedResult.modelPolicyDecision,
        fallbackUsed: allowedResult.providerFallbackUsed,
      },
      blocked: {
        proposalId: blockedResult.proposal.id,
        policy: blockedResult.modelPolicyDecision,
        fallbackUsed: blockedResult.providerFallbackUsed,
        fallbackReason: blockedResult.providerFallbackReason,
      },
    },
    null,
    2,
  ),
);

function createPaidRepairStrategy(): ProviderStrategyConfig {
  return {
    defaultProvider: 'openrouter',
    roles: [
      {
        role: 'planner',
        provider: 'openrouter',
        model: 'openai/gpt-oss-120b:free',
        tier: 'free',
        fallbackModels: ['openai/gpt-4o-mini'],
        allowPremium: false,
      },
      {
        role: 'retriever',
        provider: 'openrouter',
        model: 'openai/gpt-oss-120b:free',
        tier: 'free',
        fallbackModels: ['openai/gpt-4o-mini'],
        allowPremium: false,
      },
      {
        role: 'coder',
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        tier: 'cheap',
        fallbackModels: ['openai/gpt-oss-120b:free'],
        allowPremium: false,
      },
      {
        role: 'reviewer',
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        tier: 'cheap',
        fallbackModels: ['openai/gpt-oss-120b:free'],
        allowPremium: false,
      },
      {
        role: 'repair',
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        tier: 'cheap',
        fallbackModels: ['openai/gpt-oss-120b:free'],
        allowPremium: false,
      },
    ],
  };
}
