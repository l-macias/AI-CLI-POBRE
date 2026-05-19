import { ModelBudgetController } from '../providers/ModelBudgetController.js';
import { ProviderRuntimePolicy } from '../providers/ProviderRuntimePolicy.js';
import { ProviderStrategy } from '../providers/ProviderStrategy.js';
import type { ProviderStrategyConfig } from '../types/ProviderStrategyTypes.js';

function main(): void {
  const defaultPolicy = new ProviderRuntimePolicy({
    strategy: new ProviderStrategy({
      defaultModel: 'openai/gpt-4o-mini',
    }),
    budgetController: new ModelBudgetController(),
  });

  const plannerDecision = defaultPolicy.evaluate({
    role: 'planner',
    riskLevel: 'medium',
    estimatedPromptTokens: 1000,
    estimatedCompletionTokens: 1200,
    allowPremium: false,
    premiumApproved: false,
  });

  const overBudgetDecision = defaultPolicy.evaluate({
    role: 'planner',
    riskLevel: 'medium',
    estimatedPromptTokens: 20_000,
    estimatedCompletionTokens: 1200,
    allowPremium: false,
    premiumApproved: false,
  });

  const premiumPolicy = new ProviderRuntimePolicy({
    strategy: new ProviderStrategy({
      config: createPremiumStrategy(),
    }),
    budgetController: new ModelBudgetController(),
  });

  const premiumBlockedDecision = premiumPolicy.evaluate({
    role: 'planner',
    riskLevel: 'high',
    estimatedPromptTokens: 1000,
    estimatedCompletionTokens: 1200,
    allowPremium: true,
    premiumApproved: false,
  });

  const premiumApprovedDecision = premiumPolicy.evaluate({
    role: 'planner',
    riskLevel: 'high',
    estimatedPromptTokens: 1000,
    estimatedCompletionTokens: 1200,
    allowPremium: true,
    premiumApproved: true,
  });

  defaultPolicy.recordUsage({
    selection: plannerDecision.selection,
    usage: {
      promptTokens: 1000,
      completionTokens: 1200,
      totalTokens: 2200,
    },
    reason: 'provider runtime policy test',
  });

  const snapshot = defaultPolicy.snapshot();

  console.log({
    plannerDecision,
    overBudgetDecision,
    premiumBlockedDecision,
    premiumApprovedDecision,
    snapshot,
  });

  assertEqual(plannerDecision.allowed ? 'yes' : 'no', 'yes');
  assertEqual(plannerDecision.selection.role, 'planner');
  assertEqual(plannerDecision.selection.provider, 'openrouter');
  assertEqual(plannerDecision.selection.premiumSelected ? 'yes' : 'no', 'no');

  assertEqual(overBudgetDecision.allowed ? 'yes' : 'no', 'no');

  assertEqual(premiumBlockedDecision.allowed ? 'yes' : 'no', 'no');
  assertEqual(premiumBlockedDecision.budget.requiresPremiumApproval ? 'yes' : 'no', 'yes');

  assertEqual(premiumApprovedDecision.allowed ? 'yes' : 'no', 'yes');

  assertEqual(snapshot.auditLog.length, 2);
  assertEqual(snapshot.usageSummary.totalTokens, 2200);

  console.log('\nSession 27.9 provider runtime policy test passed.');
}

function createPremiumStrategy(): ProviderStrategyConfig {
  return {
    defaultProvider: 'openrouter',
    roles: [
      {
        role: 'planner',
        provider: 'openrouter',
        model: 'openai/gpt-5-premium',
        tier: 'premium',
        fallbackModels: ['openai/gpt-4o-mini'],
        allowPremium: true,
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
        model: 'openai/gpt-oss-120b:free',
        tier: 'free',
        fallbackModels: ['openai/gpt-4o-mini'],
        allowPremium: false,
      },
    ],
  };
}

function assertEqual(actual: string | number, expected: string | number): void {
  if (actual !== expected) {
    throw new Error(`Expected "${String(expected)}", received "${String(actual)}".`);
  }
}

try {
  main();
} catch (error: unknown) {
  console.error(error);
  process.exitCode = 1;
}
