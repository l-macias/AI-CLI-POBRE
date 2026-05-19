import { z } from 'zod';
import type { PatchOperation, PatchProposal } from '../types/RepairTypes.js';

export const repairRiskLevelSchema = z.enum(['low', 'medium', 'high']);

export const repairOperationKindSchema = z.enum([
  'replace_file',
  'edit_file',
  'create_file',
  'delete_file',
]);

const patchOperationBaseSchema = z.object({
  targetFile: z.string().trim().min(1, 'targetFile must be a non-empty string.'),
  expectedCurrentContent: z.string().optional(),
  reason: z.string().trim().min(1, 'reason must be a non-empty string.'),
});

const replaceFileOperationSchema = patchOperationBaseSchema.extend({
  kind: z.literal('replace_file'),
  newContent: z.string(),
});

const editFileOperationSchema = patchOperationBaseSchema.extend({
  kind: z.literal('edit_file'),
  newContent: z.string(),
});

const createFileOperationSchema = patchOperationBaseSchema.extend({
  kind: z.literal('create_file'),
  newContent: z.string(),
});

const deleteFileOperationSchema = patchOperationBaseSchema.extend({
  kind: z.literal('delete_file'),
  newContent: z.never().optional(),
});

export const patchOperationSchema = z.discriminatedUnion('kind', [
  replaceFileOperationSchema,
  editFileOperationSchema,
  createFileOperationSchema,
  deleteFileOperationSchema,
]) satisfies z.ZodType<PatchOperation>;

export const patchProposalSchema = z.object({
  id: z.string().trim().min(1, 'id must be a non-empty string.'),
  summary: z.string(),
  riskLevel: repairRiskLevelSchema,
  operations: z.array(patchOperationSchema),
  explanation: z.string(),
}) satisfies z.ZodType<PatchProposal>;

export type PatchProposalSchemaOutput = z.infer<typeof patchProposalSchema>;
