import { z } from 'zod';

export const runtimePatchProviderFileSchema = z
  .object({
    path: z.string().min(1).max(300),
    operation: z.enum(['modify', 'create']),
    content: z.string().min(1),
    reason: z.string().min(10).max(700),
  })
  .strict();

export const runtimePatchProviderSchema = z
  .object({
    summary: z.string().min(10).max(900),
    files: z.array(runtimePatchProviderFileSchema).min(1).max(5),
  })
  .strict();

export type RuntimePatchProviderOutput = z.infer<typeof runtimePatchProviderSchema>;
