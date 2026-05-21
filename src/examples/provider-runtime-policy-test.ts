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

  const strongRoutingDecision = defaultPolicy.evaluate({
    role: 'coder',
    riskLevel: 'high',
    estimatedPromptTokens: 7000,
    estimatedCompletionTokens: 1200,
    allowPremium: false,
    premiumApproved: false,
    precisionRequirement: 'high',
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
    precisionRequirement: 'high',
  });

  const premiumApprovedDecision = premiumPolicy.evaluate({
    role: 'planner',
    riskLevel: 'high',
    estimatedPromptTokens: 1000,
    estimatedCompletionTokens: 1200,
    allowPremium: true,
    premiumApproved: true,
    precisionRequirement: 'high',
  });

  const fallbackPolicy = new ProviderRuntimePolicy({
    strategy: new ProviderStrategy({
      config: createFallbackStrategy(),
    }),
    budgetController: new ModelBudgetController(),
  });

  const fallbackDecision = fallbackPolicy.evaluate({
    role: 'planner',
    riskLevel: 'medium',
    estimatedPromptTokens: 9000,
    estimatedCompletionTokens: 2000,
    allowPremium: false,
    premiumApproved: false,
  });

  const premiumFallbackSkippedDecision = fallbackPolicy.evaluate({
    role: 'reviewer',
    riskLevel: 'high',
    requestedModel: 'openai/gpt-5-premium',
    estimatedPromptTokens: 1000,
    estimatedCompletionTokens: 1200,
    allowPremium: false,
    premiumApproved: false,
    precisionRequirement: 'high',
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
    strongRoutingDecision,
    overBudgetDecision,
    premiumBlockedDecision,
    premiumApprovedDecision,
    fallbackDecision,
    premiumFallbackSkippedDecision,
    snapshot,
  });

  assertEqual(plannerDecision.allowed ? 'yes' : 'no', 'yes');
  assertEqual(plannerDecision.selection.role, 'planner');
  assertEqual(plannerDecision.selection.provider, 'openrouter');
  assertEqual(plannerDecision.selection.profile ?? '', 'cheap');
  assertEqual(plannerDecision.selection.premiumSelected ? 'yes' : 'no', 'no');
  assertEqual(plannerDecision.fallback.used ? 'yes' : 'no', 'no');

  assertEqual(strongRoutingDecision.selection.profile ?? '', 'strong');
  assertEqual(strongRoutingDecision.selection.tier, 'standard');
  assertEqual(strongRoutingDecision.selection.premiumSelected ? 'yes' : 'no', 'no');

  assertEqual(overBudgetDecision.allowed ? 'yes' : 'no', 'no');

  assertEqual(premiumBlockedDecision.allowed ? 'yes' : 'no', 'yes');
  assertEqual(premiumBlockedDecision.fallback.used ? 'yes' : 'no', 'yes');
  assertEqual(premiumBlockedDecision.fallback.originalModel, 'openai/gpt-5-premium');
  assertEqual(premiumBlockedDecision.selection.model, 'openai/gpt-4o-mini');
  assertEqual(premiumBlockedDecision.selection.premiumSelected ? 'yes' : 'no', 'no');
  assertEqual(premiumBlockedDecision.budget.requiresPremiumApproval ? 'yes' : 'no', 'no');
  assertEqual(
    premiumBlockedDecision.fallback.attempts.some((attempt) => {
      return attempt.model === 'openai/gpt-4o-mini' && attempt.allowed;
    })
      ? 'yes'
      : 'no',
    'yes',
  );

  assertEqual(premiumApprovedDecision.allowed ? 'yes' : 'no', 'yes');
  assertEqual(premiumApprovedDecision.selection.profile ?? '', 'premium');

  assertEqual(fallbackDecision.allowed ? 'yes' : 'no', 'no');
  assertEqual(fallbackDecision.fallback.used ? 'yes' : 'no', 'no');
  assertEqual(fallbackDecision.fallback.originalModel, 'openai/gpt-4o-mini');
  assertEqual(
    fallbackDecision.fallback.reason.includes('no fallback candidate passed runtime policy')
      ? 'yes'
      : 'no',
    'yes',
  );

  assertEqual(premiumFallbackSkippedDecision.allowed ? 'yes' : 'no', 'yes');
  assertEqual(premiumFallbackSkippedDecision.fallback.used ? 'yes' : 'no', 'yes');
  assertEqual(premiumFallbackSkippedDecision.selection.model, 'openai/gpt-4o-mini');
  assertEqual(
    premiumFallbackSkippedDecision.fallback.attempts.some((attempt) => {
      return attempt.skipped && attempt.model === 'openai/gpt-5-premium';
    })
      ? 'yes'
      : 'no',
    'yes',
  );

  assertEqual(snapshot.auditLog.length, 5);
  assertEqual(snapshot.usageSummary.totalTokens, 2200);
  assertEqual(
    snapshot.auditLog.some((entry) => {
      return entry.routingReasons?.some((reason) =>
        reason.includes('Fallback candidate evaluated after primary model was blocked'),
      );
    })
      ? 'yes'
      : 'no',
    'yes',
  );
  console.log('\nSession 54.C provider runtime policy test passed.');
}

function createPremiumStrategy(): ProviderStrategyConfig {
  return {
    defaultProvider: 'openrouter',
    profiles: createProfiles(),
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

function createFallbackStrategy(): ProviderStrategyConfig {
  return {
    defaultProvider: 'openrouter',
    profiles: createProfiles(),
    roles: [
      {
        role: 'planner',
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        tier: 'cheap',
        preferredProfile: 'cheap',
        fallbackModels: ['openai/gpt-oss-120b:free'],
        allowPremium: false,
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
        model: 'openai/gpt-5-premium',
        tier: 'premium',
        preferredProfile: 'premium',
        fallbackModels: ['openai/gpt-5-premium', 'openai/gpt-4o-mini'],
        allowPremium: true,
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

function createProfiles(): ProviderStrategyConfig['profiles'] {
  return [
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
  ];
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
