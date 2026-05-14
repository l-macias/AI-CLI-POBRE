import { copyFile, mkdir } from 'node:fs/promises';
import { fromRoot } from '../../utils/paths.js';
import type { ResolvedProjectPath } from './FileSystemPathUtils.js';

export interface FileBackupResult {
  backupPath: string;
  absoluteBackupPath: string;
}

export class FileBackupManager {
  public async backupResolvedFile(input: {
    resolvedPath: ResolvedProjectPath;
    reason: string;
  }): Promise<FileBackupResult> {
    const timestamp = new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '');

    const safeName = input.resolvedPath.relativePath.replaceAll('/', '__').replaceAll('\\', '__');
    const backupRelativeDirectory = `.runtime/backups/${timestamp}`;
    const backupRelativePath = `${backupRelativeDirectory}/${safeName}.bak`;
    const absoluteBackupDirectory = fromRoot(backupRelativeDirectory);
    const absoluteBackupPath = fromRoot(backupRelativePath);

    await mkdir(absoluteBackupDirectory, {
      recursive: true,
    });

    await copyFile(input.resolvedPath.absolutePath, absoluteBackupPath);

    return {
      backupPath: backupRelativePath,
      absoluteBackupPath,
    };
  }
}
