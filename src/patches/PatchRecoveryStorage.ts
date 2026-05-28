import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PatchRecoveryLoopResult } from './PatchRecoveryLoop.js';

export interface PatchRecoveryStorageSaveResult {
  recoveryPath: string;
  activeRecoveryPath: string;
}

export class PatchRecoveryStorage {
  public async save(result: PatchRecoveryLoopResult): Promise<PatchRecoveryStorageSaveResult> {
    const recoveryDirectory = this.resolveSessionDirectory(result.sessionId);

    await mkdir(recoveryDirectory, {
      recursive: true,
    });

    const recoveryPath = path.join(recoveryDirectory, `${this.safeSegment(result.id)}.json`);
    const activeRecoveryPath = path.resolve('.runtime', 'active-patch-recovery.json');
    const serialized = `${JSON.stringify(result, null, 2)}\n`;

    await writeFile(recoveryPath, serialized, 'utf8');
    await writeFile(activeRecoveryPath, serialized, 'utf8');

    return {
      recoveryPath,
      activeRecoveryPath,
    };
  }

  public async read(recoveryPath: string): Promise<PatchRecoveryLoopResult> {
    const raw = await readFile(recoveryPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);

    if (!this.isPatchRecoveryLoopResult(parsed)) {
      throw new Error(`Invalid patch recovery result file: ${recoveryPath}`);
    }

    return parsed;
  }

  public async listByProposal(input: {
    sessionId: string;
    proposalId: string;
  }): Promise<PatchRecoveryLoopResult[]> {
    const directory = this.resolveSessionDirectory(input.sessionId);

    let entries: string[];

    try {
      entries = await readdir(directory);
    } catch {
      return [];
    }

    const results: PatchRecoveryLoopResult[] = [];

    for (const entry of entries) {
      if (!entry.endsWith('.json')) {
        continue;
      }

      const recovery = await this.read(path.join(directory, entry));

      if (recovery.proposalId === input.proposalId) {
        results.push(recovery);
      }
    }

    return results.sort((first, second) => first.createdAt.localeCompare(second.createdAt));
  }

  public async findLatestByProposal(input: {
    sessionId: string;
    proposalId: string;
  }): Promise<PatchRecoveryLoopResult | null> {
    const results = await this.listByProposal(input);

    return results.at(-1) ?? null;
  }

  public async countAttempts(input: { sessionId: string; proposalId: string }): Promise<number> {
    const results = await this.listByProposal(input);

    return results.reduce((total, recovery) => total + recovery.attempts.length, 0);
  }

  private resolveSessionDirectory(sessionId: string): string {
    return path.resolve('.runtime', 'patch-recoveries', this.safeSegment(sessionId));
  }

  private isPatchRecoveryLoopResult(value: unknown): value is PatchRecoveryLoopResult {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['id'] === 'string' &&
      (value['status'] === 'repair_prompt_ready' ||
        value['status'] === 'max_attempts_reached' ||
        value['status'] === 'not_recoverable') &&
      typeof value['proposalId'] === 'string' &&
      typeof value['sessionId'] === 'string' &&
      typeof value['currentAttempt'] === 'number' &&
      typeof value['maxAttempts'] === 'number' &&
      Array.isArray(value['attempts']) &&
      Array.isArray(value['issues']) &&
      typeof value['createdAt'] === 'string'
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
      throw new Error('Patch recovery storage segment cannot be empty.');
    }

    return normalized;
  }
  public async listBySession(sessionId: string): Promise<PatchRecoveryLoopResult[]> {
    const directory = this.resolveSessionDirectory(sessionId);

    let entries: string[];

    try {
      entries = await readdir(directory);
    } catch {
      return [];
    }

    const results: PatchRecoveryLoopResult[] = [];

    for (const entry of entries) {
      if (!entry.endsWith('.json')) {
        continue;
      }

      results.push(await this.read(path.join(directory, entry)));
    }

    return results.sort((first, second) => first.createdAt.localeCompare(second.createdAt));
  }
}
