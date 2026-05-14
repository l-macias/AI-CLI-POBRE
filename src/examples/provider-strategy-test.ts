import { ProviderStrategy } from '../providers/ProviderStrategy.js';
import type { ProviderStrategyConfig } from '../types/ProviderStrategyTypes.js';

function main(): void {
  const strategy = new ProviderStrategy({
    defaultModel: 'openai/gpt-4o-mini',
  });

  const planner = strategy.select({
    role: 'planner',
    riskLevel: 'medium',
  });

  const retriever = strategy.select({
    role: 'retriever',
    riskLevel: 'low',
  });

  const repair = strategy.select({
    role: 'repair',
    riskLevel: 'low',
  });

  const requested = strategy.select({
    role: 'coder',
    riskLevel: 'medium',
    requestedModel: 'openai/gpt-oss-120b:free',
  });

  const premiumBlocked = new ProviderStrategy({
    config: createPremiumConfiguredStrategy(),
  }).select({
    role: 'planner',
    riskLevel: 'high',
    allowPremium: false,
  });

  console.log({
    planner,
    retriever,
    repair,
    requested,
    premiumBlocked,
    auditLog: strategy.getAuditLog(),
  });

  assertEqual(planner.provider, 'openrouter');
  assertEqual(planner.model, 'openai/gpt-4o-mini');
  assertEqual(planner.premiumSelected ? 'yes' : 'no', 'no');

  assertEqual(retriever.model, 'openai/gpt-oss-120b:free');
  assertEqual(repair.model, 'openai/gpt-oss-120b:free');
  assertEqual(requested.model, 'openai/gpt-oss-120b:free');

  assertEqual(premiumBlocked.model, 'openai/gpt-4o-mini');
  assertEqual(premiumBlocked.premiumSelected ? 'yes' : 'no', 'no');

  assertEqual(strategy.getAuditLog().length, 4);

  console.log('\nSession 27 provider strategy test passed.');
}

function createPremiumConfiguredStrategy(): ProviderStrategyConfig {
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
