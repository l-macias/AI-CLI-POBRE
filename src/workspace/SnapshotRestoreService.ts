import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { ProtectedPathPolicy } from '../security/ProtectedPathPolicy.js';
import type { SnapshotManifest, SnapshotManifestFile } from './SnapshotManifest.js';

export interface SnapshotRestoreServiceOptions {
  pathPolicy?: ProtectedPathPolicy | undefined;
}

export interface SnapshotRestoreResult {
  snapshotId: string;
  restoredFiles: string[];
  deletedFiles: string[];
  failedFiles: string[];
  restoredAt: string;
}

export class SnapshotRestoreService {
  private readonly pathPolicy: ProtectedPathPolicy;

  public constructor(options: SnapshotRestoreServiceOptions = {}) {
    this.pathPolicy = options.pathPolicy ?? new ProtectedPathPolicy();
  }

  public async restore(manifest: SnapshotManifest): Promise<SnapshotRestoreResult> {
    const restoredAt = new Date().toISOString();
    const restoredFiles: string[] = [];
    const deletedFiles: string[] = [];
    const failedFiles: string[] = [];

    for (const file of manifest.files) {
      try {
        await this.restoreFile(manifest, file);

        if (file.existedBefore) {
          restoredFiles.push(file.targetFile);
        } else {
          deletedFiles.push(file.targetFile);
        }
      } catch {
        failedFiles.push(file.targetFile);
      }
    }

    return {
      snapshotId: manifest.snapshotId,
      restoredFiles,
      deletedFiles,
      failedFiles,
      restoredAt,
    };
  }

  private async restoreFile(manifest: SnapshotManifest, file: SnapshotManifestFile): Promise<void> {
    const policy = await this.pathPolicy.validateTargetWithFilesystem({
      projectRoot: manifest.projectRoot,
      targetPath: file.targetFile,
      operation: 'write',
      source: 'snapshot-restore-service',
    });

    if (!policy.allowed || !policy.absoluteTargetPath) {
      throw new Error(`Restore blocked for ${file.targetFile}`);
    }

    const absoluteTarget = resolve(policy.absoluteTargetPath);

    if (!file.existedBefore) {
      await rm(absoluteTarget, {
        force: true,
      });

      return;
    }

    const content = await readFile(file.beforePath, 'utf8');

    await mkdir(dirname(absoluteTarget), {
      recursive: true,
    });

    await writeFile(absoluteTarget, content, 'utf8');
  }
}
