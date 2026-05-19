import { readFile, stat } from 'node:fs/promises';
import { normalize, relative, resolve } from 'node:path';
import type { RealProjectTrialSafetyIssue } from '../types/RealProjectTrialTypes.js';

export interface RealProjectTrialReadFileInput {
  projectRoot: string;
  relativePath: string;
  maxBytes?: number | undefined;
}

export interface RealProjectTrialReadFileResult {
  relativePath: string;
  absolutePath: string;
  content: string;
  bytes: number;
  issues: RealProjectTrialSafetyIssue[];
}

export class RealProjectTrialFileReader {
  public async read(input: RealProjectTrialReadFileInput): Promise<RealProjectTrialReadFileResult> {
    const issues: RealProjectTrialSafetyIssue[] = [];
    const projectRoot = resolve(input.projectRoot);
    const absolutePath = resolve(projectRoot, input.relativePath);
    const pathFromRoot = relative(projectRoot, absolutePath);
    const maxBytes = input.maxBytes ?? 128_000;

    if (pathFromRoot.startsWith('..') || pathFromRoot === '..') {
      throw new Error(`Target file escapes project root: ${input.relativePath}`);
    }

    if (this.isSensitivePath(input.relativePath)) {
      throw new Error(`Sensitive file cannot be read: ${input.relativePath}`);
    }

    const fileStat = await stat(absolutePath);

    if (!fileStat.isFile()) {
      throw new Error(`Target is not a file: ${input.relativePath}`);
    }

    if (fileStat.size > maxBytes) {
      issues.push({
        code: 'REAL_PROJECT_TRIAL_FILE_TOO_LARGE',
        message: `File size ${String(fileStat.size)} exceeds maxBytes ${String(maxBytes)}.`,
        severity: 'error',
      });

      return {
        relativePath: input.relativePath,
        absolutePath,
        content: '',
        bytes: fileStat.size,
        issues,
      };
    }

    const content = await readFile(absolutePath, 'utf8');

    return {
      relativePath: input.relativePath,
      absolutePath,
      content,
      bytes: Buffer.byteLength(content, 'utf8'),
      issues,
    };
  }

  private isSensitivePath(relativePath: string): boolean {
    const normalized = normalize(relativePath);
    const baseName = normalized.split(/[\\/]/).at(-1) ?? normalized;

    return (
      baseName === '.env' ||
      baseName === '.env.local' ||
      baseName === '.env.production' ||
      baseName === '.env.development' ||
      baseName === '.env.test'
    );
  }
}
