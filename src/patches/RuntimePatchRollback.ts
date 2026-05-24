import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { dirname } from 'node:path';
import { ProtectedPathPolicy } from '../security/ProtectedPathPolicy.js';
import type { PatchApplyResult } from '../patch-apply/PatchApplyTypes.js';

export type RuntimePatchRollbackStatus = 'rolled_back' | 'blocked' | 'dry_run' | 'failed';

export interface RuntimePatchRollbackIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface RuntimePatchRollbackOperationResult {
  targetFile: string;
  status: 'restored' | 'deleted_created_file' | 'skipped' | 'failed';
  message: string;
  backupPath?: string | undefined;
}

export interface RuntimePatchRollbackInput {
  applyResult: PatchApplyResult;
  rollbackConfirmed: boolean;
  dryRun?: boolean | undefined;
}

export interface RuntimePatchRollbackResult {
  id: string;
  status: RuntimePatchRollbackStatus;
  projectRoot: string;
  applyId: string;
  proposalId: string;
  operationResults: RuntimePatchRollbackOperationResult[];
  issues: RuntimePatchRollbackIssue[];
  createdAt: string;
  completedAt: string;
}

export interface RuntimePatchRollbackOptions {
  pathPolicy?: ProtectedPathPolicy | undefined;
}

export class RuntimePatchRollback {
  private readonly pathPolicy: ProtectedPathPolicy;

  public constructor(options: RuntimePatchRollbackOptions = {}) {
    this.pathPolicy = options.pathPolicy ?? new ProtectedPathPolicy();
  }

  public async rollback(input: RuntimePatchRollbackInput): Promise<RuntimePatchRollbackResult> {
    const createdAt = new Date().toISOString();
    const rollbackId = `patch-rollback-${createdAt.replaceAll(':', '').replaceAll('.', '')}`;
    const issues = this.validateInput(input);

    if (issues.some((issue) => issue.severity === 'error')) {
      return this.result({
        id: rollbackId,
        status: 'blocked',
        input,
        operationResults: [],
        issues,
        createdAt,
      });
    }

    if (input.dryRun === true) {
      return this.result({
        id: rollbackId,
        status: 'dry_run',
        input,
        operationResults: input.applyResult.operationResults.map((operation) => ({
          targetFile: operation.targetFile,
          status: 'skipped',
          message: 'Dry run: rollback operation validated but not executed.',
          ...(operation.backup ? { backupPath: operation.backup.backupPath } : {}),
        })),
        issues,
        createdAt,
      });
    }

    const operationResults: RuntimePatchRollbackOperationResult[] = [];

    try {
      for (const operation of input.applyResult.operationResults) {
        if (operation.status !== 'applied') {
          operationResults.push({
            targetFile: operation.targetFile,
            status: 'skipped',
            message: `Operation was not applied, rollback skipped: ${operation.status}.`,
          });

          continue;
        }

        if (!operation.backup) {
          operationResults.push({
            targetFile: operation.targetFile,
            status: 'failed',
            message: 'Applied operation has no backup metadata.',
          });

          continue;
        }

        const pathResult = await this.pathPolicy.validateTargetWithFilesystem({
          projectRoot: input.applyResult.projectRoot,
          targetPath: operation.targetFile,
          operation: 'patch',
          source: 'runtime-patch-rollback',
        });

        if (!pathResult.allowed || !pathResult.absoluteTargetPath) {
          operationResults.push({
            targetFile: operation.targetFile,
            status: 'failed',
            message: `Rollback path blocked: ${pathResult.findings
              .map((finding) => finding.code)
              .join(', ')}`,
            backupPath: operation.backup.backupPath,
          });

          continue;
        }

        this.assertBackupPathInsideProject({
          projectRoot: input.applyResult.projectRoot,
          backupPath: operation.backup.backupPath,
        });

        if (!operation.backup.existed) {
          await rm(pathResult.absoluteTargetPath, {
            force: true,
          });

          operationResults.push({
            targetFile: operation.targetFile,
            status: 'deleted_created_file',
            message: 'Rollback removed file that did not exist before apply.',
            backupPath: operation.backup.backupPath,
          });

          continue;
        }

        const previousContent = await readFile(operation.backup.backupPath, 'utf8');

        await mkdir(dirname(pathResult.absoluteTargetPath), {
          recursive: true,
        });

        await writeFile(pathResult.absoluteTargetPath, previousContent, 'utf8');

        operationResults.push({
          targetFile: operation.targetFile,
          status: 'restored',
          message: 'Rollback restored previous file content.',
          backupPath: operation.backup.backupPath,
        });
      }

      const hasFailedOperation = operationResults.some(
        (operation) => operation.status === 'failed',
      );

      return this.result({
        id: rollbackId,
        status: hasFailedOperation ? 'failed' : 'rolled_back',
        input,
        operationResults,
        issues,
        createdAt,
      });
    } catch (error) {
      return this.result({
        id: rollbackId,
        status: 'failed',
        input,
        operationResults,
        issues: [
          ...issues,
          {
            code: 'PATCH_ROLLBACK_FAILED',
            message: error instanceof Error ? error.message : String(error),
            severity: 'error',
          },
        ],
        createdAt,
      });
    }
  }

  private validateInput(input: RuntimePatchRollbackInput): RuntimePatchRollbackIssue[] {
    const issues: RuntimePatchRollbackIssue[] = [];

    if (input.applyResult.status !== 'applied') {
      issues.push({
        code: 'PATCH_ROLLBACK_APPLY_NOT_APPLIED',
        message: 'Rollback requires an applied PatchApplyResult.',
        severity: 'error',
      });
    }

    if (input.dryRun !== true && input.rollbackConfirmed !== true) {
      issues.push({
        code: 'PATCH_ROLLBACK_CONFIRMATION_REQUIRED',
        message: 'Rollback requires explicit rollback confirmation.',
        severity: 'error',
      });
    }

    if (input.applyResult.operationResults.length === 0) {
      issues.push({
        code: 'PATCH_ROLLBACK_NO_OPERATIONS',
        message: 'Rollback requires at least one apply operation result.',
        severity: 'error',
      });
    }

    for (const operation of input.applyResult.operationResults) {
      if (operation.status === 'applied' && !operation.backup) {
        issues.push({
          code: 'PATCH_ROLLBACK_BACKUP_REQUIRED',
          message: `Applied operation has no backup metadata: ${operation.targetFile}`,
          severity: 'error',
        });
      }
    }

    return issues;
  }

  private assertBackupPathInsideProject(input: { projectRoot: string; backupPath: string }): void {
    const projectRoot = path.resolve(input.projectRoot);
    const backupPath = path.resolve(input.backupPath);

    if (!backupPath.startsWith(`${projectRoot}${path.sep}`)) {
      throw new Error(`Backup path escapes project root: ${input.backupPath}`);
    }
  }

  private result(input: {
    id: string;
    status: RuntimePatchRollbackStatus;
    input: RuntimePatchRollbackInput;
    operationResults: RuntimePatchRollbackOperationResult[];
    issues: RuntimePatchRollbackIssue[];
    createdAt: string;
  }): RuntimePatchRollbackResult {
    return {
      id: input.id,
      status: input.status,
      projectRoot: input.input.applyResult.projectRoot,
      applyId: input.input.applyResult.id,
      proposalId: input.input.applyResult.proposalId,
      operationResults: input.operationResults,
      issues: input.issues,
      createdAt: input.createdAt,
      completedAt: new Date().toISOString(),
    };
  }
}
