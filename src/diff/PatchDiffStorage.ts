import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PatchDiffBuildResult } from './PatchDiffTypes.js';

export interface PatchDiffStorageSaveResult {
  diffPath: string;
  activeDiffPath: string;
}

export class PatchDiffStorage {
  public async save(result: PatchDiffBuildResult): Promise<PatchDiffStorageSaveResult> {
    const diffDirectory = path.resolve(
      '.runtime',
      'patch-diffs',
      this.safeSegment(result.diff.sessionId),
    );

    await mkdir(diffDirectory, {
      recursive: true,
    });

    const diffPath = path.join(diffDirectory, `${this.safeSegment(result.diff.id)}.json`);
    const activeDiffPath = path.resolve('.runtime', 'active-patch-diff.json');

    const serialized = `${JSON.stringify(result, null, 2)}\n`;

    await writeFile(diffPath, serialized, 'utf8');
    await writeFile(activeDiffPath, serialized, 'utf8');

    return {
      diffPath,
      activeDiffPath,
    };
  }

  private safeSegment(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9._-]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    if (normalized.length === 0) {
      throw new Error('Patch diff storage segment cannot be empty.');
    }

    return normalized;
  }
}
