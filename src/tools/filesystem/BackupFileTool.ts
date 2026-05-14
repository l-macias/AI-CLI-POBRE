import { stat } from 'node:fs/promises';
import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { backupFileToolInputSchema } from '../ToolSchemas.js';
import { FileBackupManager } from './FileBackupManager.js';
import { FileSystemPathUtils } from './FileSystemPathUtils.js';

export class BackupFileTool implements RuntimeTool<typeof backupFileToolInputSchema> {
  public readonly name = 'backup_file';
  public readonly description = 'Create a runtime backup of a project file.';
  public readonly permissions = ['read', 'write'] as const;
  public readonly inputSchema = backupFileToolInputSchema;

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
          code: 'BACKUP_FILE_INPUT_INVALID',
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
            code: 'BACKUP_FILE_TARGET_NOT_FILE',
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
            code: 'BACKUP_FILE_TOO_LARGE',
            message: `File size ${String(fileStats.size)} exceeds maxBytes ${String(maxBytes)}.`,
            severity: 'error',
          },
        ],
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const backup = await this.backupManager.backupResolvedFile({
      resolvedPath,
      reason: parsed.data.reason ?? 'manual backup',
    });

    const now = new Date();

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'executed',
      output: {
        target: resolvedPath.relativePath,
        backupPath: backup.backupPath,
        bytes: fileStats.size,
      },
      issues: [],
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };
  }
}
