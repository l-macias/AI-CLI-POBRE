import { z } from 'zod';

export const planStepTypeSchema = z.enum([
  'inspect',
  'create_file',
  'edit_file',
  'run_command',
  'validate',
  'document',
  'checkpoint',
]);

export const planRiskLevelSchema = z.enum(['low', 'medium', 'high']);

export const toolIntentSchema = z
  .object({
    toolName: z.string().min(1).max(120),
    input: z.record(z.string(), z.unknown()),
  })
  .strict();

export const runtimePlanStepSchema = z
  .object({
    id: z.string().min(1),
    type: planStepTypeSchema,
    title: z.string().min(3).max(120),
    description: z.string().min(5).max(500),
    target: z.string().max(300).optional(),
    command: z.string().max(500).optional(),
    expectedOutcome: z.string().min(5).max(500),
    requiresApproval: z.boolean(),
    toolIntent: toolIntentSchema.optional(),
  })
  .strict();

export const runtimePlanSchema = z
  .object({
    title: z.string().min(3).max(120),
    summary: z.string().min(10).max(800),
    riskLevel: planRiskLevelSchema,
    steps: z.array(runtimePlanStepSchema).min(1).max(6),
  })
  .strict();

export type RuntimePlanModelOutput = z.infer<typeof runtimePlanSchema>;
