import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PatchSandboxResult } from './SandboxResult.js';

export interface SandboxResultStorageSaveResult {
  resultPath: string;
  activeResultPath: string;
}

export class SandboxResultStorage {
  public async save(result: PatchSandboxResult): Promise<SandboxResultStorageSaveResult> {
    const resultDirectory = path.resolve(
      '.runtime',
      'sandbox-results',
      this.safeSegment(result.sessionId),
    );

    await mkdir(resultDirectory, {
      recursive: true,
    });

    const resultPath = path.join(resultDirectory, `${this.safeSegment(result.id)}.json`);
    const activeResultPath = path.resolve('.runtime', 'active-sandbox-result.json');
    const serialized = `${JSON.stringify(result, null, 2)}\n`;

    await writeFile(resultPath, serialized, 'utf8');
    await writeFile(activeResultPath, serialized, 'utf8');

    return {
      resultPath,
      activeResultPath,
    };
  }

  public async read(resultPath: string): Promise<PatchSandboxResult> {
    const raw = await readFile(resultPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);

    if (!this.isPatchSandboxResult(parsed)) {
      throw new Error(`Invalid sandbox result file: ${resultPath}`);
    }

    return parsed;
  }

  private isPatchSandboxResult(value: unknown): value is PatchSandboxResult {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['id'] === 'string' &&
      (value['status'] === 'passed' ||
        value['status'] === 'failed' ||
        value['status'] === 'blocked') &&
      typeof value['proposalId'] === 'string' &&
      typeof value['sessionId'] === 'string' &&
      typeof value['projectRoot'] === 'string' &&
      Array.isArray(value['verifyRuns']) &&
      Array.isArray(value['issues']) &&
      typeof value['startedAt'] === 'string' &&
      typeof value['completedAt'] === 'string'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private safeSegment(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9._-]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    if (normalized.length === 0) {
      throw new Error('Sandbox result storage segment cannot be empty.');
    }

    return normalized;
  }
}
