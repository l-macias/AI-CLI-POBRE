import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { RuntimeDirectoryInspection } from './BootstrapTypes.js';

export const requiredRuntimeFiles = [
  'current-state.md',
  'active-module.md',
  'decisions.md',
  'next-steps.md',
  'progress-log.md',
  'handoff.md',
  'runtime-rules.md',
  'provider-rules.md',
  'coding-conventions.md',
  'security-policy.md',
  'project-profile.md',
  'runtime-config.json',
] as const;

export class RuntimeDirectoryInspector {
  public async inspect(rootDir: string): Promise<RuntimeDirectoryInspection> {
    const runtimeDir = path.join(rootDir, '.runtime');
    const runtimeExists = await this.directoryExists(runtimeDir);
    const existingFiles = runtimeExists ? await this.readRuntimeFiles(runtimeDir) : [];
    const missingFiles = requiredRuntimeFiles.filter((file) => !existingFiles.includes(file));

    return {
      rootDir,
      runtimeDir,
      runtimeExists,
      existingFiles,
      missingFiles,
      inspectedAt: new Date().toISOString(),
    };
  }

  private async directoryExists(directoryPath: string): Promise<boolean> {
    try {
      const result = await stat(directoryPath);

      return result.isDirectory();
    } catch {
      return false;
    }
  }

  private async readRuntimeFiles(runtimeDir: string): Promise<string[]> {
    try {
      const entries = await readdir(runtimeDir, {
        withFileTypes: true,
      });

      return entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .sort();
    } catch {
      return [];
    }
  }
}
