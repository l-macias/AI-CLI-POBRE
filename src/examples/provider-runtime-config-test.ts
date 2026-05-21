import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ProviderRuntimeConfigLoader } from '../providers/ProviderRuntimeConfigLoader.js';
import { ProviderRuntimeFactory } from '../providers/ProviderRuntimeFactory.js';
import type { ProviderRuntimeConfig } from '../types/ProviderRuntimeConfigTypes.js';

const testRoot = path.resolve(process.cwd(), '.runtime/provider-config-tests');
const validConfigPath = '.runtime/provider-config-tests/provider-runtime-config.json';
const invalidConfigPath = '.runtime/provider-config-tests/invalid-provider-runtime-config.json';
const missingConfigPath = '.runtime/provider-config-tests/missing-provider-runtime-config.json';

async function main(): Promise<void> {
  await resetTestRoot();

  await writeFile(
    path.resolve(process.cwd(), validConfigPath),
    JSON.stringify(createValidConfig(), null, 2),
    'utf8',
  );

  await writeFile(
    path.resolve(process.cwd(), invalidConfigPath),
    JSON.stringify(
      {
        providerStrategy: {
          defaultProvider: 'openrouter',
          profiles: [],
          roles: [],
        },
        modelBudget: {},
      },
      null,
      2,
    ),
    'utf8',
  );

  const validLoad = await new ProviderRuntimeConfigLoader({
    configPath: validConfigPath,
  }).load();

  const invalidLoad = await new ProviderRuntimeConfigLoader({
    configPath: invalidConfigPath,
  }).load();

  const missingLoad = await new ProviderRuntimeConfigLoader({
    configPath: missingConfigPath,
  }).load();

  const factory = new ProviderRuntimeFactory();
  const runtimePolicy = factory.createFromConfigLoadResult(validLoad).runtimePolicy;

  const plannerDecision = runtimePolicy.evaluate({
    role: 'planner',
    riskLevel: 'medium',
    estimatedPromptTokens: 1000,
    estimatedCompletionTokens: 300,
    allowPremium: false,
    premiumApproved: false,
  });

  const premiumDecision = runtimePolicy.evaluate({
    role: 'reviewer',
    riskLevel: 'high',
    estimatedPromptTokens: 1000,
    estimatedCompletionTokens: 300,
    allowPremium: false,
    premiumApproved: false,
  });

  console.log({
    validLoad,
    invalidLoad,
    missingLoad,
    plannerDecision,
    premiumDecision,
  });

  assertEqual(validLoad.source, 'external');
  assertEqual(validLoad.issues.length, 0);
  assertEqual(validLoad.config.providerStrategy.profiles?.length ?? 0, 5);

  assertEqual(invalidLoad.source, 'fallback');
  assertEqual(invalidLoad.issues[0]?.code ?? '', 'PROVIDER_RUNTIME_CONFIG_INVALID');

  assertEqual(missingLoad.source, 'fallback');
  assertEqual(missingLoad.issues[0]?.code ?? '', 'PROVIDER_RUNTIME_CONFIG_NOT_FOUND');
  assertEqual(missingLoad.config.providerStrategy.profiles?.length ?? 0, 5);

  assertEqual(plannerDecision.allowed ? 'yes' : 'no', 'yes');
  assertEqual(plannerDecision.selection.model, 'openai/gpt-4o-mini');
  assertEqual(plannerDecision.selection.profile ?? '', 'cheap');

  assertEqual(premiumDecision.allowed ? 'yes' : 'no', 'yes');
  assertEqual(premiumDecision.selection.model, 'openai/gpt-4o-mini');
  assertEqual(premiumDecision.selection.profile ?? '', 'strong');
  assertEqual(premiumDecision.selection.premiumSelected ? 'yes' : 'no', 'no');

  console.log('\nSession 54.B provider runtime config test passed.');
}

function createValidConfig(): ProviderRuntimeConfig {
  return {
    providerStrategy: {
      defaultProvider: 'openrouter',
      profiles: [
        {
          profile: 'free',
          provider: 'openrouter',
          model: 'openai/gpt-oss-120b:free',
          tier: 'free',
          allowPremium: false,
          description: 'Free deterministic profile.',
          fallbackModels: ['openai/gpt-4o-mini'],
        },
        {
          profile: 'cheap',
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          tier: 'cheap',
          allowPremium: false,
          description: 'Cheap default profile.',
          fallbackModels: ['openai/gpt-oss-120b:free'],
        },
        {
          profile: 'strong',
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          tier: 'standard',
          allowPremium: false,
          description: 'Strong non-premium profile.',
          fallbackModels: ['openai/gpt-oss-120b:free'],
        },
        {
          profile: 'local',
          provider: 'openrouter',
          model: 'local/runtime-controlled-model',
          tier: 'free',
          allowPremium: false,
          description: 'Local placeholder profile.',
          fallbackModels: ['openai/gpt-oss-120b:free'],
        },
        {
          profile: 'premium',
          provider: 'openrouter',
          model: 'openai/gpt-5-premium',
          tier: 'premium',
          allowPremium: true,
          description: 'Premium explicit approval profile.',
          fallbackModels: ['openai/gpt-4o-mini'],
        },
      ],
      roles: [
        {
          role: 'planner',
          provider: 'openrouter',
          model: 'openai/gpt-oss-120b:free',
          tier: 'free',
          preferredProfile: 'free',
          fallbackModels: ['openai/gpt-4o-mini'],
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
          fallbackModels: ['openai/gpt-4o-mini'],
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
    },
    modelBudget: {
      tokenLimit: {
        maxPromptTokens: 8_000,
        maxCompletionTokens: 2_000,
        maxTotalTokens: 10_000,
      },
      costLimit: {
        maxEstimatedUsd: 0.05,
        maxSessionUsd: 1,
      },
      pricing: [
        {
          provider: 'openrouter',
          model: 'openai/gpt-oss-120b:free',
          tier: 'free',
          inputUsdPerMillionTokens: 0,
          outputUsdPerMillionTokens: 0,
        },
        {
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          tier: 'cheap',
          inputUsdPerMillionTokens: 0.15,
          outputUsdPerMillionTokens: 0.6,
        },
        {
          provider: 'openrouter',
          model: 'openai/gpt-5-premium',
          tier: 'premium',
          inputUsdPerMillionTokens: 2,
          outputUsdPerMillionTokens: 8,
        },
      ],
    },
  };
}

async function resetTestRoot(): Promise<void> {
  await rm(testRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(testRoot, {
    recursive: true,
  });
}

function assertEqual(actual: string | number, expected: string | number): void {
  if (actual !== expected) {
    throw new Error(`Expected "${String(expected)}", received "${String(actual)}".`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
