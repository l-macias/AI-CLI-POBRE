import { ModelBudgetController } from '../providers/ModelBudgetController.js';
import { ProviderStrategy } from '../providers/ProviderStrategy.js';
import { ProviderUsageLedger } from '../providers/ProviderUsageLedger.js';
import type { ProviderStrategyConfig } from '../types/ProviderStrategyTypes.js';

function main(): void {
  const strategy = new ProviderStrategy({
    defaultModel: 'openai/gpt-4o-mini',
  });

  const controller = new ModelBudgetController();
  const ledger = new ProviderUsageLedger();

  const freeSelection = strategy.select({
    role: 'retriever',
    riskLevel: 'low',
  });

  const freeDecision = controller.check({
    selection: freeSelection,
    estimatedPromptTokens: 1000,
    estimatedCompletionTokens: 300,
  });

  const cheapSelection = strategy.select({
    role: 'planner',
    riskLevel: 'medium',
  });

  const cheapDecision = controller.check({
    selection: cheapSelection,
    estimatedPromptTokens: 1000,
    estimatedCompletionTokens: 300,
  });

  const overTokenDecision = controller.check({
    selection: cheapSelection,
    estimatedPromptTokens: 20_000,
    estimatedCompletionTokens: 300,
  });

  const premiumStrategy = new ProviderStrategy({
    config: createPremiumStrategy(),
  });

  const premiumSelection = premiumStrategy.select({
    role: 'planner',
    riskLevel: 'high',
    allowPremium: true,
  });

  const premiumBlockedDecision = controller.check({
    selection: premiumSelection,
    estimatedPromptTokens: 1000,
    estimatedCompletionTokens: 300,
  });

  const premiumApprovedDecision = controller.check({
    selection: premiumSelection,
    estimatedPromptTokens: 1000,
    estimatedCompletionTokens: 300,
    premiumApproved: true,
  });

  const ledgerEntry = ledger.record({
    selection: cheapSelection,
    usage: {
      promptTokens: 1000,
      completionTokens: 300,
      totalTokens: 1300,
    },
    reason: 'model budget controller test',
  });

  const ledgerSummary = ledger.summarize();

  console.log({
    freeDecision,
    cheapDecision,
    overTokenDecision,
    premiumBlockedDecision,
    premiumApprovedDecision,
    ledgerEntry,
    ledgerSummary,
  });

  assertEqual(freeDecision.allowed ? 'yes' : 'no', 'yes');
  assertEqual(cheapDecision.allowed ? 'yes' : 'no', 'yes');
  assertEqual(overTokenDecision.allowed ? 'yes' : 'no', 'no');

  assertEqual(premiumBlockedDecision.allowed ? 'yes' : 'no', 'no');
  assertEqual(premiumBlockedDecision.requiresPremiumApproval ? 'yes' : 'no', 'yes');

  assertEqual(premiumApprovedDecision.allowed ? 'yes' : 'no', 'yes');

  assertEqual(ledgerSummary.totalPromptTokens, 1000);
  assertEqual(ledgerSummary.totalCompletionTokens, 300);
  assertEqual(ledgerSummary.totalTokens, 1300);

  console.log('\nSession 27.5 model budget controller test passed.');
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
