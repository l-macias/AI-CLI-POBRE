import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, relative, resolve } from 'node:path';
import type { BenchmarkFixture } from '../types/BenchmarkTypes.js';

export interface BenchmarkFixtureManagerOptions {
  rootDir?: string | undefined;
}

export class BenchmarkFixtureManager {
  private readonly rootDir: string;

  public constructor(options: BenchmarkFixtureManagerOptions = {}) {
    this.rootDir = resolve(options.rootDir ?? '.runtime/benchmark-fixtures');
  }

  public async prepare(fixture: BenchmarkFixture): Promise<string> {
    const fixturePath = resolve(this.rootDir, fixture.id);

    await this.assertInsideRoot(fixturePath);
    await rm(fixturePath, {
      recursive: true,
      force: true,
    });
    await mkdir(fixturePath, {
      recursive: true,
    });

    for (const file of fixture.files) {
      const targetPath = resolve(fixturePath, file.relativePath);

      await this.assertInsideRoot(targetPath);

      await mkdir(dirname(targetPath), {
        recursive: true,
      });

      await writeFile(targetPath, file.content, 'utf8');
    }

    return fixturePath;
  }

  public async cleanup(): Promise<void> {
    await rm(this.rootDir, {
      recursive: true,
      force: true,
    });
  }

  private async assertInsideRoot(targetPath: string): Promise<void> {
    const normalizedRoot = normalize(this.rootDir);
    const normalizedTarget = normalize(targetPath);
    const pathFromRoot = relative(normalizedRoot, normalizedTarget);

    if (
      pathFromRoot.startsWith('..') ||
      pathFromRoot === '..' ||
      pathFromRoot.includes(`..${join('', '/')}`)
    ) {
      throw new Error(`Benchmark fixture path escapes root: ${targetPath}`);
    }

    await Promise.resolve();
  }
}
