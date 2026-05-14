import { readFile, stat, writeFile } from 'node:fs/promises';
import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { editFileToolInputSchema } from '../ToolSchemas.js';
import { FileBackupManager } from './FileBackupManager.js';
import { FileSystemPathUtils } from './FileSystemPathUtils.js';

export class EditFileTool implements RuntimeTool<typeof editFileToolInputSchema> {
  public readonly name = 'edit_file';
  public readonly description =
    'Edit an existing project file after diff confirmation and automatic backup.';
  public readonly permissions = ['read', 'write'] as const;
  public readonly inputSchema = editFileToolInputSchema;

  private readonly pathUtils = new FileSystemPathUtils();
  private readonly backupManager = new FileBackupManager();

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
          code: 'EDIT_FILE_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const maxBytes = parsed.data.maxBytes ?? 1_000_000;
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
            code: 'EDIT_FILE_TARGET_NOT_FILE',
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
            code: 'EDIT_FILE_TOO_LARGE',
            message: `File size ${String(fileStats.size)} exceeds maxBytes ${String(maxBytes)}.`,
            severity: 'error',
          },
        ],
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const currentContent = await readFile(resolvedPath.absolutePath, 'utf8');

    if (
      parsed.data.expectedCurrentContent !== undefined &&
      parsed.data.expectedCurrentContent !== currentContent
    ) {
      const now = new Date();

      return {
        requestId: context.requestId,
        toolName: context.toolName,
        status: 'rejected',
        issues: [
          {
            code: 'EDIT_FILE_CURRENT_CONTENT_MISMATCH',
            message: 'Current file content does not match expectedCurrentContent. Edit blocked.',
            severity: 'error',
          },
        ],
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const backup = await this.backupManager.backupResolvedFile({
      resolvedPath,
      reason: 'automatic backup before edit',
    });

    await writeFile(resolvedPath.absolutePath, parsed.data.newContent, 'utf8');

    const now = new Date();

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'executed',
      output: {
        target: resolvedPath.relativePath,
        backupPath: backup.backupPath,
        bytesBefore: Buffer.byteLength(currentContent, 'utf8'),
        bytesAfter: Buffer.byteLength(parsed.data.newContent, 'utf8'),
        diffConfirmed: parsed.data.diffConfirmed,
      },
      issues: [],
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };
  }
}
