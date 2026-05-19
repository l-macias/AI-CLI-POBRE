import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { PatchBackupEntry } from './PatchApplyTypes.js';

export class PatchBackupWriter {
  public async backup(input: {
    projectRoot: string;
    targetFile: string;
    applyId: string;
  }): Promise<PatchBackupEntry> {
    const createdAt = new Date().toISOString();
    const absoluteTarget = resolve(input.projectRoot, input.targetFile);
    const backupPath = resolve(
      input.projectRoot,
      '.runtime/patch-backups',
      input.applyId,
      input.targetFile,
    );

    try {
      const content = await readFile(absoluteTarget, 'utf8');

      await mkdir(dirname(backupPath), {
        recursive: true,
      });

      await writeFile(backupPath, content, 'utf8');

      return {
        targetFile: input.targetFile,
        backupPath,
        existed: true,
        createdAt,
      };
    } catch {
      await mkdir(dirname(backupPath), {
        recursive: true,
      });

      await writeFile(`${backupPath}.missing`, 'missing\n', 'utf8');

      return {
        targetFile: input.targetFile,
        backupPath: `${backupPath}.missing`,
        existed: false,
        createdAt,
      };
    }
  }
}
