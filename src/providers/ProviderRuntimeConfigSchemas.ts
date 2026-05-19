import { z } from 'zod';

const providerNameSchema = z.literal('openrouter');

const modelTierSchema = z.union([
  z.literal('free'),
  z.literal('cheap'),
  z.literal('standard'),
  z.literal('premium'),
]);

const providerTaskRoleSchema = z.union([
  z.literal('planner'),
  z.literal('retriever'),
  z.literal('coder'),
  z.literal('reviewer'),
  z.literal('repair'),
]);

const roleModelConfigSchema = z
  .object({
    role: providerTaskRoleSchema,
    provider: providerNameSchema,
    model: z.string().min(1),
    tier: modelTierSchema,
    fallbackModels: z.array(z.string().min(1)),
    allowPremium: z.boolean(),
  })
  .strict();

export const providerStrategyConfigSchema = z
  .object({
    defaultProvider: providerNameSchema,
    roles: z.array(roleModelConfigSchema).min(5),
  })
  .strict();

const tokenBudgetLimitSchema = z
  .object({
    maxPromptTokens: z.number().int().positive(),
    maxCompletionTokens: z.number().int().positive(),
    maxTotalTokens: z.number().int().positive(),
  })
  .strict();

const costBudgetLimitSchema = z
  .object({
    maxEstimatedUsd: z.number().nonnegative(),
    maxSessionUsd: z.number().nonnegative(),
  })
  .strict();

const modelPricingSchema = z
  .object({
    provider: providerNameSchema,
    model: z.string().min(1),
    tier: modelTierSchema,
    inputUsdPerMillionTokens: z.number().nonnegative(),
    outputUsdPerMillionTokens: z.number().nonnegative(),
  })
  .strict();

export const providerModelBudgetConfigSchema = z
  .object({
    tokenLimit: tokenBudgetLimitSchema,
    costLimit: costBudgetLimitSchema,
    pricing: z.array(modelPricingSchema),
  })
  .strict();

export const providerRuntimeConfigSchema = z
  .object({
    providerStrategy: providerStrategyConfigSchema,
    modelBudget: providerModelBudgetConfigSchema,
  })
  .strict();
