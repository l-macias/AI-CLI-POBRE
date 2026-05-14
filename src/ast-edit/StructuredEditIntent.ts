import { z } from 'zod';

const baseIntentSchema = z.object({
  targetFilePath: z.string().min(1).max(300),
});

export const addImportIntentSchema = baseIntentSchema
  .extend({
    kind: z.literal('add_import'),
    importStatement: z.string().min(1).max(1000),
  })
  .strict();

export const removeImportIntentSchema = baseIntentSchema
  .extend({
    kind: z.literal('remove_import'),
    importStatementIncludes: z.string().min(1).max(300),
  })
  .strict();

export const replaceFunctionIntentSchema = baseIntentSchema
  .extend({
    kind: z.literal('replace_function'),
    functionName: z.string().min(1).max(120),
    replacement: z.string().min(1).max(100_000),
  })
  .strict();

export const replaceFunctionBodyIntentSchema = baseIntentSchema
  .extend({
    kind: z.literal('replace_function_body'),
    functionName: z.string().min(1).max(120),
    replacementBody: z.string().max(100_000),
  })
  .strict();

export const addNamedExportIntentSchema = baseIntentSchema
  .extend({
    kind: z.literal('add_named_export'),
    exportName: z.string().min(1).max(120),
  })
  .strict();

export const removeNamedExportIntentSchema = baseIntentSchema
  .extend({
    kind: z.literal('remove_named_export'),
    exportName: z.string().min(1).max(120),
  })
  .strict();

export const structuredEditIntentSchema = z.discriminatedUnion('kind', [
  addImportIntentSchema,
  removeImportIntentSchema,
  replaceFunctionIntentSchema,
  replaceFunctionBodyIntentSchema,
  addNamedExportIntentSchema,
  removeNamedExportIntentSchema,
]);

export const astEditToolInputSchema = z
  .object({
    intent: structuredEditIntentSchema,
    maxBytes: z.number().int().positive().max(1_000_000).optional(),
  })
  .strict();

export type ASTEditToolInput = z.infer<typeof astEditToolInputSchema>;
