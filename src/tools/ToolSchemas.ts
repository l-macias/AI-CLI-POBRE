import { z } from 'zod';

export const toolExecutionRequestSchema = z
  .object({
    id: z.string().min(1),
    toolName: z.string().min(1),
    input: z.unknown(),
    requestedAt: z.string().datetime(),
    proposedBy: z.enum(['model', 'runtime', 'user']),
  })
  .strict();

export const toolIntentSchema = z
  .object({
    toolName: z.string().min(1),
    input: z.unknown(),
  })
  .strict();

export const inspectOnlyToolInputSchema = z
  .object({
    target: z.string().min(1).max(300),
  })
  .strict();

export const readFileToolInputSchema = z
  .object({
    target: z.string().min(1).max(300),
    maxBytes: z.number().int().positive().max(1_000_000).optional(),
  })
  .strict();

export const listDirectoryToolInputSchema = z
  .object({
    target: z.string().min(1).max(300),
    recursive: z.boolean().optional(),
    maxEntries: z.number().int().positive().max(1000).optional(),
  })
  .strict();

export const searchFilesToolInputSchema = z
  .object({
    target: z.string().min(1).max(300).optional(),
    query: z.string().min(1).max(120),
    maxResults: z.number().int().positive().max(200).optional(),
  })
  .strict();

export const diffFileToolInputSchema = z
  .object({
    target: z.string().min(1).max(300),
    compareContent: z.string().max(200_000),
    maxBytes: z.number().int().positive().max(1_000_000).optional(),
  })
  .strict();

export const createFileToolInputSchema = z
  .object({
    target: z.string().min(1).max(300),
    content: z.string().max(500_000),
    overwrite: z.literal(false).optional(),
  })
  .strict();

export const editFileToolInputSchema = z
  .object({
    target: z.string().min(1).max(300),
    newContent: z.string().max(500_000),
    expectedCurrentContent: z.string().max(500_000).optional(),
    diffConfirmed: z.literal(true),
    maxBytes: z.number().int().positive().max(1_000_000).optional(),
  })
  .strict();

export const backupFileToolInputSchema = z
  .object({
    target: z.string().min(1).max(300),
    reason: z.string().min(3).max(300).optional(),
    maxBytes: z.number().int().positive().max(1_000_000).optional(),
  })
  .strict();

export const restoreCheckpointToolInputSchema = z
  .object({
    target: z.string().min(1).max(300),
    backupPath: z.string().min(1).max(500),
    restoreConfirmed: z.literal(true),
  })
  .strict();

export const emptyToolInputSchema = z.object({}).strict();

export type ToolExecutionRequestModel = z.infer<typeof toolExecutionRequestSchema>;
export type ToolIntentModel = z.infer<typeof toolIntentSchema>;
export type ReadFileToolInput = z.infer<typeof readFileToolInputSchema>;
export type ListDirectoryToolInput = z.infer<typeof listDirectoryToolInputSchema>;
export type SearchFilesToolInput = z.infer<typeof searchFilesToolInputSchema>;
export type DiffFileToolInput = z.infer<typeof diffFileToolInputSchema>;
export type CreateFileToolInput = z.infer<typeof createFileToolInputSchema>;
export type EditFileToolInput = z.infer<typeof editFileToolInputSchema>;
export type BackupFileToolInput = z.infer<typeof backupFileToolInputSchema>;
export type RestoreCheckpointToolInput = z.infer<typeof restoreCheckpointToolInputSchema>;
