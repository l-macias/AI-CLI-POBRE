import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path, { dirname, resolve } from 'node:path';
import type { ProjectConfigFile, ProjectProfile } from './ProjectProfile.js';

export class ProjectConfigStore {
  public async write(profile: ProjectProfile): Promise<string> {
    const configPath = this.resolveConfigPath(profile.rootPath);

    const config: ProjectConfigFile = {
      version: 1,
      id: profile.id,
      name: profile.name,
      rootPath: profile.rootPath,
      stack: profile.stack,
      packageManager: profile.packageManager,
      workingMode: profile.workingMode,
      gitRequired: profile.gitRequired,
      updatedAt: new Date().toISOString(),
    };

    await mkdir(dirname(configPath), {
      recursive: true,
    });

    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

    return configPath;
  }

  public async read(projectRoot: string): Promise<ProjectConfigFile | null> {
    const configPath = this.resolveConfigPath(projectRoot);

    try {
      const raw = await readFile(configPath, 'utf8');
      const parsed: unknown = JSON.parse(raw);

      if (!this.isConfigFile(parsed)) {
        throw new Error(`Invalid project config file: ${configPath}`);
      }

      return parsed;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  public resolveConfigPath(projectRoot: string): string {
    return path.join(resolve(projectRoot), '.zero', 'project.json');
  }

  private isConfigFile(value: unknown): value is ProjectConfigFile {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      value['version'] === 1 &&
      typeof value['id'] === 'string' &&
      typeof value['name'] === 'string' &&
      typeof value['rootPath'] === 'string' &&
      Array.isArray(value['stack']) &&
      value['stack'].every((item) => typeof item === 'string') &&
      typeof value['packageManager'] === 'string' &&
      typeof value['workingMode'] === 'string' &&
      typeof value['gitRequired'] === 'boolean' &&
      typeof value['updatedAt'] === 'string'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
