import { copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { fromRoot } from '../../utils/paths.js';
import { restoreCheckpointToolInputSchema } from '../ToolSchemas.js';
import { FileBackupManager } from './FileBackupManager.js';
import { FileSystemPathUtils } from './FileSystemPathUtils.js';

export class RestoreCheckpointTool implements RuntimeTool<typeof restoreCheckpointToolInputSchema> {
  public readonly name = 'restore_checkpoint';
  public readonly description = 'Restore a project file from a runtime backup after confirmation.';
  public readonly permissions = ['read', 'write'] as const;
  public readonly inputSchema = restoreCheckpointToolInputSchema;

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
          code: 'RESTORE_CHECKPOINT_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    if (!this.isRuntimeBackupPath(parsed.data.backupPath)) {
      const now = new Date();

      return {
        requestId: context.requestId,
        toolName: context.toolName,
        status: 'rejected',
        issues: [
          {
            code: 'RESTORE_CHECKPOINT_BACKUP_PATH_INVALID',
            message: `Backup path is outside .runtime/backups: ${parsed.data.backupPath}`,
            severity: 'error',
          },
        ],
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const targetPath = this.pathUtils.resolveProjectPath(parsed.data.target);
    const backupPath = this.pathUtils.resolveProjectPath(parsed.data.backupPath);
    const backupStats = await stat(backupPath.absolutePath);

    if (!backupStats.isFile()) {
      const now = new Date();

      return {
        requestId: context.requestId,
        toolName: context.toolName,
        status: 'failed',
        issues: [
          {
            code: 'RESTORE_CHECKPOINT_BACKUP_NOT_FILE',
            message: `Backup path is not a file: ${backupPath.relativePath}`,
            severity: 'error',
          },
        ],
        executedAt: now.toISOString(),
        durationMs: now.getTime() - startedAt.getTime(),
      };
    }

    const preRestoreBackup = await this.backupManager.backupResolvedFile({
      resolvedPath: targetPath,
      reason: 'automatic backup before restore',
    });

    await copyFile(backupPath.absolutePath, targetPath.absolutePath);

    const now = new Date();

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'executed',
      output: {
        target: targetPath.relativePath,
        restoredFrom: backupPath.relativePath,
        preRestoreBackupPath: preRestoreBackup.backupPath,
      },
      issues: [],
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };
  }

  private isRuntimeBackupPath(backupPath: string): boolean {
    const normalized = backupPath
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '');
    const absoluteBackupPath = path.resolve(fromRoot(normalized));
    const absoluteBackupsRoot = path.resolve(fromRoot('.runtime/backups'));

    return (
      absoluteBackupPath === absoluteBackupsRoot ||
      absoluteBackupPath.startsWith(`${absoluteBackupsRoot}${path.sep}`)
    );
  }
}
