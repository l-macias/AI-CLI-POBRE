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

  const strongProfile = strategy.select({
    role: 'reviewer',
    riskLevel: 'medium',
    requestedProfile: 'strong',
  });

  const premiumProfileBlocked = strategy.select({
    role: 'planner',
    riskLevel: 'high',
    requestedProfile: 'premium',
    allowPremium: false,
  });

  const premiumProfileAllowed = strategy.select({
    role: 'planner',
    riskLevel: 'high',
    requestedProfile: 'premium',
    allowPremium: true,
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
    strongProfile,
    premiumProfileBlocked,
    premiumProfileAllowed,
    premiumBlocked,
    auditLog: strategy.getAuditLog(),
    config: strategy.getConfig(),
  });

  assertEqual(planner.provider, 'openrouter');
  assertEqual(planner.model, 'openai/gpt-4o-mini');
  assertEqual(planner.profile ?? '', 'cheap');
  assertEqual(planner.premiumSelected ? 'yes' : 'no', 'no');

  assertEqual(retriever.model, 'openai/gpt-oss-120b:free');
  assertEqual(retriever.profile ?? '', 'free');

  assertEqual(repair.model, 'openai/gpt-oss-120b:free');
  assertEqual(repair.profile ?? '', 'free');

  assertEqual(requested.model, 'openai/gpt-oss-120b:free');

  assertEqual(strongProfile.profile ?? '', 'strong');
  assertEqual(strongProfile.tier, 'standard');

  assertEqual(premiumProfileBlocked.model, 'openai/gpt-4o-mini');
  assertEqual(premiumProfileBlocked.premiumSelected ? 'yes' : 'no', 'no');

  assertEqual(premiumProfileAllowed.profile ?? '', 'premium');
  assertEqual(premiumProfileAllowed.tier, 'premium');
  assertEqual(premiumProfileAllowed.premiumSelected ? 'yes' : 'no', 'yes');

  assertEqual(premiumBlocked.model, 'openai/gpt-4o-mini');
  assertEqual(premiumBlocked.premiumSelected ? 'yes' : 'no', 'no');

  assertEqual(strategy.getAuditLog().length, 7);
  assertEqual(strategy.getConfig().profiles?.length ?? 0, 5);

  console.log('\nSession 54.A provider profiles test passed.');
}

function createPremiumConfiguredStrategy(): ProviderStrategyConfig {
  return {
    defaultProvider: 'openrouter',
    profiles: [
      {
        profile: 'free',
        provider: 'openrouter',
        model: 'openai/gpt-oss-120b:free',
        tier: 'free',
        allowPremium: false,
        description: 'Free profile.',
        fallbackModels: ['openai/gpt-4o-mini'],
      },
      {
        profile: 'cheap',
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        tier: 'cheap',
        allowPremium: false,
        description: 'Cheap profile.',
        fallbackModels: ['openai/gpt-oss-120b:free'],
      },
      {
        profile: 'strong',
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        tier: 'standard',
        allowPremium: false,
        description: 'Strong profile.',
        fallbackModels: ['openai/gpt-oss-120b:free'],
      },
      {
        profile: 'local',
        provider: 'openrouter',
        model: 'local/runtime-controlled-model',
        tier: 'free',
        allowPremium: false,
        description: 'Local profile.',
        fallbackModels: ['openai/gpt-oss-120b:free'],
      },
      {
        profile: 'premium',
        provider: 'openrouter',
        model: 'openai/gpt-5-premium',
        tier: 'premium',
        allowPremium: true,
        description: 'Premium profile.',
        fallbackModels: ['openai/gpt-4o-mini'],
      },
    ],
    roles: [
      {
        role: 'planner',
        provider: 'openrouter',
        model: 'openai/gpt-5-premium',
        tier: 'premium',
        preferredProfile: 'premium',
        fallbackModels: ['openai/gpt-4o-mini'],
        allowPremium: true,
      },
      {
        role: 'retriever',
        provider: 'openrouter',
        model: 'openai/gpt-oss-120b:free',
        tier: 'free',
        preferredProfile: 'free',
        fallbackModels: ['openai/gpt-4o-mini'],
        allowPremium: false,
      },
      {
        role: 'coder',
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        tier: 'cheap',
        preferredProfile: 'cheap',
        fallbackModels: ['openai/gpt-oss-120b:free'],
        allowPremium: false,
      },
      {
        role: 'reviewer',
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        tier: 'cheap',
        preferredProfile: 'cheap',
        fallbackModels: ['openai/gpt-oss-120b:free'],
        allowPremium: false,
      },
      {
        role: 'repair',
        provider: 'openrouter',
        model: 'openai/gpt-oss-120b:free',
        tier: 'free',
        preferredProfile: 'free',
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
