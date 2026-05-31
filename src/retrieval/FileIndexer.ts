import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { GeneratedPathPolicy } from '../projects/GeneratedPathPolicy.js';
import type { IndexedProjectFile } from '../types/RetrievalTypes.js';

const defaultAllowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md']);

export interface FileIndexerOptions {
  rootDir?: string | undefined;
  maxFileBytes?: number | undefined;
}

export class FileIndexer {
  private readonly rootDir: string;
  private readonly maxFileBytes: number;
  private readonly generatedPathPolicy = new GeneratedPathPolicy();

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

      if (this.generatedPathPolicy.isGeneratedPath(relativePath)) {
        continue;
      }

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
      if (this.generatedPathPolicy.isGeneratedPathSegmentName(entry.name)) {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);
      const relativePath = this.toRelativePath(absolutePath);

      if (this.generatedPathPolicy.isGeneratedPath(relativePath)) {
        continue;
      }

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

    if (this.generatedPathPolicy.isGeneratedPath(relativePath)) {
      return false;
    }

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
