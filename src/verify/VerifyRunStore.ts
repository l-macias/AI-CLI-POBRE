import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path, { dirname, resolve } from 'node:path';
import type { VerifyRunResult } from './VerifyRunner.js';

export interface VerifyRunStoreOptions {
  rootDir?: string | undefined;
}

export interface VerifyRunState {
  version: 1;
  sessionId: string;
  runs: VerifyRunResult[];
  updatedAt: string;
}

export class VerifyRunStore {
  private readonly rootDir: string;

  public constructor(options: VerifyRunStoreOptions = {}) {
    this.rootDir = resolve(options.rootDir ?? '.runtime/verify-runs');
  }

  public async add(input: { sessionId: string; run: VerifyRunResult }): Promise<VerifyRunState> {
    const current = await this.loadOrCreate(input.sessionId);
    const updatedAt = new Date().toISOString();

    const next: VerifyRunState = {
      version: 1,
      sessionId: input.sessionId,
      runs: [...current.runs, input.run],
      updatedAt,
    };

    await this.save(next);

    return next;
  }

  public async loadOrCreate(sessionId: string): Promise<VerifyRunState> {
    try {
      return await this.load(sessionId);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return {
          version: 1,
          sessionId,
          runs: [],
          updatedAt: new Date().toISOString(),
        };
      }

      throw error;
    }
  }

  public async load(sessionId: string): Promise<VerifyRunState> {
    const filePath = this.resolvePath(sessionId);
    const raw = await readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);

    if (!this.isState(parsed)) {
      throw new Error(`Invalid verify run state: ${filePath}`);
    }

    return parsed;
  }

  public resolvePath(sessionId: string): string {
    return path.join(this.rootDir, sessionId, 'verify-runs.json');
  }

  private async save(state: VerifyRunState): Promise<void> {
    const filePath = this.resolvePath(state.sessionId);

    await mkdir(dirname(filePath), {
      recursive: true,
    });

    await writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  private isState(value: unknown): value is VerifyRunState {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      value['version'] === 1 &&
      typeof value['sessionId'] === 'string' &&
      Array.isArray(value['runs']) &&
      value['runs'].every((run) => this.isVerifyRunResult(run)) &&
      typeof value['updatedAt'] === 'string'
    );
  }

  private isVerifyRunResult(value: unknown): value is VerifyRunResult {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['command'] === 'string' &&
      typeof value['cwd'] === 'string' &&
      typeof value['status'] === 'string' &&
      typeof value['stdoutSummary'] === 'string' &&
      typeof value['stderrSummary'] === 'string' &&
      Array.isArray(value['issues']) &&
      typeof value['startedAt'] === 'string' &&
      typeof value['completedAt'] === 'string' &&
      typeof value['durationMs'] === 'number'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
