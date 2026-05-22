import { resolve } from 'node:path';
import { ProjectConfigStore } from './ProjectConfigStore.js';
import { ProjectDetector } from './ProjectDetector.js';
import type { ProjectProfile, ProjectScanResult, ProjectWorkingMode } from './ProjectProfile.js';

export interface ProjectScannerOptions {
  detector?: ProjectDetector | undefined;
  configStore?: ProjectConfigStore | undefined;
}

export interface ProjectScanInput {
  rootPath: string;
  name?: string | undefined;
  workingMode?: ProjectWorkingMode | undefined;
  gitRequired?: boolean | undefined;
}

export class ProjectScanner {
  private readonly detector: ProjectDetector;
  private readonly configStore: ProjectConfigStore;

  public constructor(options: ProjectScannerOptions = {}) {
    this.detector = options.detector ?? new ProjectDetector();
    this.configStore = options.configStore ?? new ProjectConfigStore();
  }

  public async scan(input: ProjectScanInput): Promise<ProjectScanResult> {
    const rootPath = resolve(input.rootPath);
    const detected = await this.detector.detect(rootPath);
    const now = new Date().toISOString();

    const name = input.name?.trim() || this.defaultProjectName(rootPath);

    const profile: ProjectProfile = {
      id: this.createProjectId(name),
      name,
      rootPath,
      stack: detected.stack,
      packageManager: detected.packageManager,
      workingMode: input.workingMode ?? 'local_snapshot',
      gitRequired: input.gitRequired ?? false,
      hasPackageJson: detected.hasPackageJson,
      hasTsConfig: detected.hasTsConfig,
      hasSrcDirectory: detected.hasSrcDirectory,
      hasPrismaSchema: detected.hasPrismaSchema,
      createdAt: now,
      updatedAt: now,
    };

    const configPath = await this.configStore.write(profile);

    return {
      profile,
      configPath,
    };
  }

  private defaultProjectName(rootPath: string): string {
    const normalized = rootPath.replaceAll('\\', '/');
    const parts = normalized.split('/').filter((part) => part.trim().length > 0);

    return parts.at(-1) ?? 'target-project';
  }

  private createProjectId(name: string): string {
    const id = name
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    if (id.length === 0) {
      throw new Error('Project name must generate a non-empty id.');
    }

    return id;
  }
}
