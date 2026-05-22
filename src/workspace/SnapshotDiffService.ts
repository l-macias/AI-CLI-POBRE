import { readFile, writeFile } from 'node:fs/promises';
import path, { dirname } from 'node:path';
import type { SnapshotManifest, SnapshotManifestFile } from './SnapshotManifest.js';

export interface SnapshotDiffResult {
  snapshotId: string;
  changedFiles: string[];
  missingAfterFiles: string[];
  rollbackPatchPath: string;
  generatedAt: string;
}

export class SnapshotDiffService {
  public async captureAfter(manifest: SnapshotManifest): Promise<SnapshotDiffResult> {
    const changedFiles: string[] = [];
    const missingAfterFiles: string[] = [];

    for (const file of manifest.files) {
      const afterPath = path.join(manifest.afterDir, file.targetFile);

      try {
        const currentContent = await readFile(
          path.join(manifest.projectRoot, file.targetFile),
          'utf8',
        );

        await this.writeFile(afterPath, currentContent);
      } catch {
        await this.writeFile(`${afterPath}.missing`, 'missing\n');
        missingAfterFiles.push(file.targetFile);
      }

      if (await this.fileChanged(file, afterPath)) {
        changedFiles.push(file.targetFile);
      }
    }

    const generatedAt = new Date().toISOString();

    await writeFile(
      manifest.rollbackPatchPath,
      this.buildRollbackPatch({
        manifest,
        changedFiles,
        missingAfterFiles,
        generatedAt,
      }),
      'utf8',
    );

    return {
      snapshotId: manifest.snapshotId,
      changedFiles,
      missingAfterFiles,
      rollbackPatchPath: manifest.rollbackPatchPath,
      generatedAt,
    };
  }

  private async fileChanged(file: SnapshotManifestFile, afterPath: string): Promise<boolean> {
    if (!file.existedBefore) {
      try {
        await readFile(afterPath, 'utf8');
        return true;
      } catch {
        return false;
      }
    }

    try {
      const before = await readFile(file.beforePath, 'utf8');
      const after = await readFile(afterPath, 'utf8');

      return before !== after;
    } catch {
      return true;
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    await import('node:fs/promises').then(async ({ mkdir, writeFile }) => {
      await mkdir(dirname(filePath), {
        recursive: true,
      });

      await writeFile(filePath, content, 'utf8');
    });
  }

  private buildRollbackPatch(input: {
    manifest: SnapshotManifest;
    changedFiles: string[];
    missingAfterFiles: string[];
    generatedAt: string;
  }): string {
    const lines = [
      '# Zero Runtime rollback patch',
      '',
      `Snapshot: ${input.manifest.snapshotId}`,
      `Session: ${input.manifest.sessionId}`,
      `Project: ${input.manifest.projectRoot}`,
      `Generated: ${input.generatedAt}`,
      '',
      'Changed files:',
      ...(input.changedFiles.length > 0
        ? input.changedFiles.map((file) => `- ${file}`)
        : ['- none']),
      '',
      'Missing after snapshot:',
      ...(input.missingAfterFiles.length > 0
        ? input.missingAfterFiles.map((file) => `- ${file}`)
        : ['- none']),
      '',
      'Rollback behavior:',
      '- Files that existed before are restored from before/.',
      '- Files that did not exist before are deleted.',
      '',
    ];

    return `${lines.join('\n')}\n`;
  }
}
