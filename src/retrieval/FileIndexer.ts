import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { IndexedProjectFile } from '../types/RetrievalTypes.js';

const defaultAllowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md']);

const ignoredSegments = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.open-next',
  '.wrangler',
  'coverage',
]);

export interface FileIndexerOptions {
  rootDir?: string | undefined;
  maxFileBytes?: number | undefined;
}

export class FileIndexer {
  private readonly rootDir: string;
  private readonly maxFileBytes: number;

  public constructor(options: FileIndexerOptions = {}) {
    this.rootDir = options.rootDir ?? process.cwd();
    this.maxFileBytes = options.maxFileBytes ?? 250_000;
  }

  public async indexProject(): Promise<IndexedProjectFile[]> {
    const files = await this.walk(this.rootDir);
    const indexed: IndexedProjectFile[] = [];

    for (const filePath of files) {
      const fileStats = await stat(filePath);

      if (!fileStats.isFile() || fileStats.size > this.maxFileBytes) {
        continue;
      }

      const relativePath = this.toRelativePath(filePath);
      const content = await readFile(filePath, 'utf8');

      indexed.push({
        path: relativePath,
        content,
        sizeBytes: fileStats.size,
        indexedAt: new Date().toISOString(),
      });
    }

    return indexed;
  }

  private async walk(directory: string): Promise<string[]> {
    const entries = await readdir(directory, {
      withFileTypes: true,
    });

    const files: string[] = [];

    for (const entry of entries) {
      if (ignoredSegments.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await this.walk(absolutePath)));
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!this.isAllowedFile(absolutePath)) {
        continue;
      }

      files.push(absolutePath);
    }

    return files;
  }

  private isAllowedFile(filePath: string): boolean {
    const relativePath = this.toRelativePath(filePath);
    const extension = path.extname(filePath);

    if (!defaultAllowedExtensions.has(extension)) {
      return false;
    }

    if (relativePath.startsWith('.env')) {
      return false;
    }

    return true;
  }

  private toRelativePath(filePath: string): string {
    return path.relative(this.rootDir, filePath).replaceAll('\\', '/');
  }
}
