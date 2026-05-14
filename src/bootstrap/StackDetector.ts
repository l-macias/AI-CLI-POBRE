import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { DetectedStack, StackDetectionResult } from './BootstrapTypes.js';

interface PackageJsonShape {
  dependencies?: Record<string, string> | undefined;
  devDependencies?: Record<string, string> | undefined;
}

export class StackDetector {
  public async detect(rootDir: string): Promise<StackDetectionResult> {
    const entries = await this.safeReadDirectory(rootDir);
    const packageJson = await this.safeReadPackageJson(path.join(rootDir, 'package.json'));

    const hasPackageJson = entries.includes('package.json');
    const hasTsConfig = entries.includes('tsconfig.json');
    const hasSrcDirectory = await this.isDirectory(path.join(rootDir, 'src'));

    return {
      rootDir,
      stacks: this.resolveStacks({
        entries,
        packageJson,
        hasTsConfig,
      }),
      packageManager: this.resolvePackageManager(entries),
      hasPackageJson,
      hasTsConfig,
      hasSrcDirectory,
      detectedAt: new Date().toISOString(),
    };
  }

  private resolveStacks(input: {
    entries: string[];
    packageJson: PackageJsonShape | null;
    hasTsConfig: boolean;
  }): DetectedStack[] {
    const stacks = new Set<DetectedStack>();

    if (input.hasTsConfig) {
      stacks.add('typescript');
    }

    if (input.entries.includes('package.json')) {
      stacks.add('node');
    }

    const dependencies = {
      ...(input.packageJson?.dependencies ?? {}),
      ...(input.packageJson?.devDependencies ?? {}),
    };

    if ('next' in dependencies) {
      stacks.add('next');
      stacks.add('react');
    }

    if ('react' in dependencies) {
      stacks.add('react');
    }

    if (!input.hasTsConfig && input.entries.includes('package.json')) {
      stacks.add('javascript');
    }

    if (stacks.size === 0) {
      stacks.add('unknown');
    }

    return [...stacks].sort();
  }

  private resolvePackageManager(entries: string[]): StackDetectionResult['packageManager'] {
    if (entries.includes('pnpm-lock.yaml')) {
      return 'pnpm';
    }

    if (entries.includes('yarn.lock')) {
      return 'yarn';
    }

    if (entries.includes('bun.lockb')) {
      return 'bun';
    }

    if (entries.includes('package-lock.json')) {
      return 'npm';
    }

    return undefined;
  }

  private async safeReadDirectory(rootDir: string): Promise<string[]> {
    try {
      return await readdir(rootDir);
    } catch {
      return [];
    }
  }

  private async safeReadPackageJson(filePath: string): Promise<PackageJsonShape | null> {
    try {
      const content = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(content) as unknown;

      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private async isDirectory(targetPath: string): Promise<boolean> {
    try {
      const result = await stat(targetPath);

      return result.isDirectory();
    } catch {
      return false;
    }
  }
}
