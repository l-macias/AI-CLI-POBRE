import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { createFileToolInputSchema } from '../ToolSchemas.js';
import { FileSystemPathUtils } from './FileSystemPathUtils.js';

export class CreateFileTool implements RuntimeTool<typeof createFileToolInputSchema> {
  public readonly name = 'create_file';
  public readonly description = 'Create a new project file without overwriting existing files.';
  public readonly permissions = ['write'] as const;
  public readonly inputSchema = createFileToolInputSchema;

  private readonly pathUtils = new FileSystemPathUtils();

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
          code: 'CREATE_FILE_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const resolvedPath = this.pathUtils.resolveProjectPath(parsed.data.target);
    const parentDirectory = path.dirname(resolvedPath.absolutePath);

    await mkdir(parentDirectory, {
      recursive: true,
    });

    try {
      await writeFile(resolvedPath.absolutePath, parsed.data.content, {
        encoding: 'utf8',
        flag: 'wx',
      });
    } catch (error) {
      const now = new Date();

      if (this.isFileExistsError(error)) {
        return {
          requestId: context.requestId,
          toolName: context.toolName,
          status: 'rejected',
          issues: [
            {
              code: 'CREATE_FILE_TARGET_EXISTS',
              message: `Target already exists and overwrite is not allowed: ${resolvedPath.relativePath}`,
              severity: 'error',
            },
          ],
          executedAt: now.toISOString(),
          durationMs: now.getTime() - startedAt.getTime(),
        };
      }

      throw error;
    }

    const now = new Date();

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'executed',
      output: {
        target: resolvedPath.relativePath,
        bytesWritten: Buffer.byteLength(parsed.data.content, 'utf8'),
      },
      issues: [],
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };
  }

  private isFileExistsError(error: unknown): boolean {
    return error instanceof Error && 'code' in error && error.code === 'EEXIST';
  }
}
