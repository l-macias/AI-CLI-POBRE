import { readFile, stat } from 'node:fs/promises';
import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { readFileToolInputSchema } from '../ToolSchemas.js';
import { FileSystemPathUtils } from './FileSystemPathUtils.js';

export class ReadFileTool implements RuntimeTool<typeof readFileToolInputSchema> {
  public readonly name = 'read_file';
  public readonly description = 'Read a project file as UTF-8 text.';
  public readonly permissions = ['read'] as const;
  public readonly inputSchema = readFileToolInputSchema;

  private readonly pathUtils = new FileSystemPathUtils();

  public async execute(
    input: unknown,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startedAt = new Date(context.startedAt);
    const finishedAt = new Date();
    const parsed = this.inputSchema.safeParse(input);

    if (!parsed.success) {
      return {
        requestId: context.requestId,
        toolName: context.toolName,
        status: 'failed',
        issues: parsed.error.issues.map((issue) => ({
          code: 'READ_FILE_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
        executedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      };
    }

    const maxBytes = parsed.data.maxBytes ?? 64_000;
    const resolvedPath = this.pathUtils.resolveProjectPath(parsed.data.target);
    const fileStats = await stat(resolvedPath.absolutePath);

    if (!fileStats.isFile()) {
      const now = new Date();

      return {
        requestId: context.requestId,
        toolName: context.toolName,
        status: 'failed',
        issues: [
          {
            code: 'READ_FILE_TARGET_NOT_FILE',
            message: `Target is not a file: ${resolvedPath.relativePath}`,
            severity: 'error',
          },
        ],
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    if (fileStats.size > maxBytes) {
      const now = new Date();

      return {
        requestId: context.requestId,
        toolName: context.toolName,
        status: 'rejected',
        issues: [
          {
            code: 'READ_FILE_TOO_LARGE',
            message: `File size ${String(fileStats.size)} exceeds maxBytes ${String(maxBytes)}.`,
            severity: 'error',
          },
        ],
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const content = await readFile(resolvedPath.absolutePath, 'utf8');
    const now = new Date();

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'executed',
      output: {
        target: resolvedPath.relativePath,
        bytes: fileStats.size,
        content,
      },
      issues: [],
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };
  }
}
