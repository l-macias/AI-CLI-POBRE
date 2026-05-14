import { readFile, stat } from 'node:fs/promises';
import type { RuntimeTool, ToolExecutionContext, ToolExecutionResult } from '../types/ToolTypes.js';
import type { ASTEditToolOutput } from '../types/ASTEditTypes.js';
import { FileSystemPathUtils } from '../tools/filesystem/FileSystemPathUtils.js';
import { astEditToolInputSchema } from './StructuredEditIntent.js';
import { SafeReplacementPlanner } from './SafeReplacementPlanner.js';
import { StructuredEditPreviewBuilder } from './StructuredEditPreview.js';

export interface ASTEditToolOptions {
  planner?: SafeReplacementPlanner | undefined;
  previewBuilder?: StructuredEditPreviewBuilder | undefined;
  pathUtils?: FileSystemPathUtils | undefined;
}

export class ASTEditTool implements RuntimeTool<typeof astEditToolInputSchema> {
  public readonly name = 'ast_edit_preview';
  public readonly description =
    'Prepare a safe structured edit preview without modifying the target file.';
  public readonly permissions = ['read'] as const;
  public readonly inputSchema = astEditToolInputSchema;

  private readonly planner: SafeReplacementPlanner;
  private readonly previewBuilder: StructuredEditPreviewBuilder;
  private readonly pathUtils: FileSystemPathUtils;

  public constructor(options: ASTEditToolOptions = {}) {
    this.planner = options.planner ?? new SafeReplacementPlanner();
    this.previewBuilder = options.previewBuilder ?? new StructuredEditPreviewBuilder();
    this.pathUtils = options.pathUtils ?? new FileSystemPathUtils();
  }

  public async execute(
    input: unknown,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startedAt = new Date(context.startedAt);
    const parsed = this.inputSchema.safeParse(input);

    if (!parsed.success) {
      const now = new Date();

      return {
        requestId: context.requestId,
        toolName: context.toolName,
        status: 'failed',
        issues: parsed.error.issues.map((issue) => ({
          code: 'AST_EDIT_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const maxBytes = parsed.data.maxBytes ?? 1_000_000;
    const resolvedPath = this.pathUtils.resolveProjectPath(parsed.data.intent.targetFilePath);
    const fileStats = await stat(resolvedPath.absolutePath);

    if (!fileStats.isFile()) {
      return this.createRejectedResult(context, startedAt, [
        {
          code: 'AST_EDIT_TARGET_NOT_FILE',
          message: `Target is not a file: ${resolvedPath.relativePath}`,
          severity: 'error',
        },
      ]);
    }

    if (fileStats.size > maxBytes) {
      return this.createRejectedResult(context, startedAt, [
        {
          code: 'AST_EDIT_FILE_TOO_LARGE',
          message: `File size ${String(fileStats.size)} exceeds maxBytes ${String(maxBytes)}.`,
          severity: 'error',
        },
      ]);
    }

    const currentContent = await readFile(resolvedPath.absolutePath, 'utf8');
    const plan = this.planner.plan(currentContent, {
      ...parsed.data.intent,
      targetFilePath: resolvedPath.relativePath,
    });

    const preview = this.previewBuilder.build(plan);
    const hasError = preview.issues.some((issue) => issue.severity === 'error');
    const now = new Date();

    const output: ASTEditToolOutput = {
      targetFilePath: resolvedPath.relativePath,
      changed: preview.changed,
      preview,
    };

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status: hasError ? 'rejected' : 'executed',
      output,
      issues: preview.issues,
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };
  }

  private createRejectedResult(
    context: ToolExecutionContext,
    startedAt: Date,
    issues: ToolExecutionResult['issues'],
  ): ToolExecutionResult {
    const now = new Date();

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'rejected',
      issues,
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };
  }
}
