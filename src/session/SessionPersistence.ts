import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fromRoot } from '../utils/paths.js';

export class SessionPersistence {
  private readonly runtimeDir = fromRoot('.runtime');

  public async ensureRuntimeDir(): Promise<void> {
    await mkdir(this.runtimeDir, {
      recursive: true,
    });
  }

  public async readRuntimeFile(fileName: string): Promise<string | null> {
    await this.ensureRuntimeDir();

    const filePath = this.getRuntimeFilePath(fileName);

    try {
      return await readFile(filePath, 'utf8');
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  public async writeRuntimeFile(fileName: string, content: string): Promise<void> {
    await this.ensureRuntimeDir();

    const filePath = this.getRuntimeFilePath(fileName);

    await writeFile(filePath, content, 'utf8');
  }

  private getRuntimeFilePath(fileName: string): string {
    return path.join(this.runtimeDir, fileName);
  }
}
