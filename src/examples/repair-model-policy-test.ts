import { ModelBudgetController } from '../providers/ModelBudgetController.js';
import { ModelPricingCatalog } from '../providers/ModelPricingCatalog.js';
import { ProviderStrategy } from '../providers/ProviderStrategy.js';
import { FakeLlmRepairProposalProvider } from '../repair/FakeLlmRepairProposalProvider.js';
import { RepairCostEstimator } from '../repair/RepairCostEstimator.js';
import { RepairModelPolicy } from '../repair/RepairModelPolicy.js';
import { RepairProviderFallback } from '../repair/RepairProviderFallback.js';
import { StaticRepairProposalProvider } from '../repair/StaticRepairProposalProvider.js';
import type { PatchProposal } from '../types/RepairTypes.js';
import type { ProviderStrategyConfig } from '../types/ProviderStrategyTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const prompt = `Repair this TypeScript component.

FILE:
src/components/Broken.tsx

export function Broken() {
  return <section>Broken</section>;
}
`;

const freeEstimator = new RepairCostEstimator();

const fakePolicy = new RepairModelPolicy();

const fakeDecision = fakePolicy.evaluate({
  provider: 'fake-llm',
  prompt,
  riskLevel: 'low',
});

assert(fakeDecision.allowed, 'Expected fake provider to be allowed.');
assert(fakeDecision.selectedProvider === 'fake-llm', 'Expected fake provider selected.');
assert(fakeDecision.estimate.estimatedUsd === 0, 'Expected fake provider zero cost.');

const staticDecision = fakePolicy.evaluate({
  provider: 'static',
  prompt,
  riskLevel: 'low',
});

assert(staticDecision.allowed, 'Expected static provider to be allowed.');
assert(staticDecision.selectedProvider === 'static', 'Expected static provider selected.');
assert(staticDecision.estimate.estimatedUsd === 0, 'Expected static provider zero cost.');

const openRouterFreeDecision = fakePolicy.evaluate({
  provider: 'openrouter',
  prompt,
  riskLevel: 'medium',
  estimatedCompletionTokens: 800,
});

assert(openRouterFreeDecision.allowed, 'Expected free OpenRouter repair model to be allowed.');
assert(openRouterFreeDecision.selectedProvider === 'openrouter', 'Expected OpenRouter provider.');
assert(
  openRouterFreeDecision.selectedModel === 'openai/gpt-oss-120b:free',
  'Expected default free repair model.',
);

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

const expensiveEstimator = new RepairCostEstimator({
  pricingCatalog: expensivePricingCatalog,
});

const expensivePolicy = new RepairModelPolicy({
  estimator: expensiveEstimator,
  strategy: new ProviderStrategy({
    config: createPaidRepairStrategy(),
  }),
  budgetController: new ModelBudgetController({
    pricingCatalog: expensivePricingCatalog,
  }),
});

const expensiveDecision = expensivePolicy.evaluate({
  provider: 'openrouter',
  prompt: `${prompt}\n${'large-context\n'.repeat(500)}`,
  riskLevel: 'high',
  estimatedCompletionTokens: 2_000,
});

assert(!expensiveDecision.allowed, 'Expected expensive repair model decision to be blocked.');
assert(
  expensiveDecision.issues.some((issue) => issue.code === 'ESTIMATED_COST_BUDGET_EXCEEDED'),
  'Expected cost budget issue.',
);

const fallback = new RepairProviderFallback();
const staticProposal = createStaticProposal();

const fallbackResult = fallback.resolve({
  primary: new FakeLlmRepairProposalProvider(),
  fallback: new StaticRepairProposalProvider(staticProposal),
  policyDecision: expensiveDecision,
});

assert(fallbackResult.fallbackUsed, 'Expected fallback to be used when policy blocks primary.');

const allowedFallbackResult = fallback.resolve({
  primary: new FakeLlmRepairProposalProvider(),
  fallback: new StaticRepairProposalProvider(staticProposal),
  policyDecision: fakeDecision,
});

assert(!allowedFallbackResult.fallbackUsed, 'Expected primary provider when policy allows it.');

console.log(
  JSON.stringify(
    {
      message: 'Repair model policy test completed',
      fakeDecision,
      staticDecision,
      openRouterFreeDecision,
      expensiveDecision,
      fallbackUsedWhenBlocked: fallbackResult.fallbackUsed,
      fallbackUsedWhenAllowed: allowedFallbackResult.fallbackUsed,
      freeEstimate: freeEstimator.estimate({
        provider: 'openrouter',
        model: 'openai/gpt-oss-120b:free',
        prompt,
        estimatedCompletionTokens: 800,
      }),
    },
    null,
    2,
  ),
);

function createStaticProposal(): PatchProposal {
  return {
    id: 'fallback-static-proposal',
    summary: 'Fallback static proposal.',
    riskLevel: 'low',
    operations: [],
    explanation: 'Fallback provider used because primary model policy was blocked.',
  };
}

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
