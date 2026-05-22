import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path, { dirname, resolve } from 'node:path';
import type { ProjectProfile, ProjectRegistryState } from './ProjectProfile.js';

export interface ProjectRegistryOptions {
  workspaceRoot?: string | undefined;
}

export class ProjectRegistry {
  private readonly workspaceRoot: string;

  public constructor(options: ProjectRegistryOptions = {}) {
    this.workspaceRoot = resolve(options.workspaceRoot ?? process.cwd());
  }

  public async add(profile: ProjectProfile): Promise<ProjectRegistryState> {
    const registry = await this.load();
    const existingIndex = registry.projects.findIndex((project) => project.id === profile.id);

    const projects =
      existingIndex >= 0
        ? registry.projects.map((project, index) => (index === existingIndex ? profile : project))
        : [...registry.projects, profile];

    const updated: ProjectRegistryState = {
      version: 1,
      currentProjectId: profile.id,
      projects,
    };

    await this.write(updated);

    return updated;
  }

  public async list(): Promise<ProjectRegistryState> {
    return this.load();
  }

  public async current(): Promise<ProjectProfile | null> {
    const registry = await this.load();

    if (registry.currentProjectId === null) {
      return null;
    }

    return registry.projects.find((project) => project.id === registry.currentProjectId) ?? null;
  }

  public async use(projectRef: string): Promise<ProjectRegistryState> {
    const registry = await this.load();
    const project = this.findProject(registry, projectRef);

    if (!project) {
      throw new Error(`Project not found: ${projectRef}`);
    }

    const updated: ProjectRegistryState = {
      ...registry,
      currentProjectId: project.id,
    };

    await this.write(updated);

    return updated;
  }

  public async remove(projectRef: string): Promise<ProjectRegistryState> {
    const registry = await this.load();
    const project = this.findProject(registry, projectRef);

    if (!project) {
      throw new Error(`Project not found: ${projectRef}`);
    }

    const projects = registry.projects.filter((item) => item.id !== project.id);

    const updated: ProjectRegistryState = {
      version: 1,
      currentProjectId: registry.currentProjectId === project.id ? null : registry.currentProjectId,
      projects,
    };

    await this.write(updated);

    return updated;
  }

  public findProject(
    registry: ProjectRegistryState,
    projectRef: string,
  ): ProjectProfile | undefined {
    const normalized = projectRef.trim().toLowerCase();

    return registry.projects.find((project) => {
      return project.id === normalized || project.name.trim().toLowerCase() === normalized;
    });
  }

  public resolveRegistryPath(): string {
    return path.join(this.workspaceRoot, '.runtime', 'projects-registry.json');
  }

  private async load(): Promise<ProjectRegistryState> {
    const registryPath = this.resolveRegistryPath();

    try {
      const raw = await readFile(registryPath, 'utf8');
      const parsed: unknown = JSON.parse(raw);

      if (!this.isRegistryState(parsed)) {
        throw new Error(`Invalid project registry file: ${registryPath}`);
      }

      return parsed;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return {
          version: 1,
          currentProjectId: null,
          projects: [],
        };
      }

      throw error;
    }
  }

  private async write(registry: ProjectRegistryState): Promise<void> {
    const registryPath = this.resolveRegistryPath();

    await mkdir(dirname(registryPath), {
      recursive: true,
    });

    await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
  }

  private isRegistryState(value: unknown): value is ProjectRegistryState {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      value['version'] === 1 &&
      (value['currentProjectId'] === null || typeof value['currentProjectId'] === 'string') &&
      Array.isArray(value['projects']) &&
      value['projects'].every((project) => this.isProjectProfile(project))
    );
  }

  private isProjectProfile(value: unknown): value is ProjectProfile {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['id'] === 'string' &&
      typeof value['name'] === 'string' &&
      typeof value['rootPath'] === 'string' &&
      Array.isArray(value['stack']) &&
      value['stack'].every((item) => typeof item === 'string') &&
      typeof value['packageManager'] === 'string' &&
      typeof value['workingMode'] === 'string' &&
      typeof value['gitRequired'] === 'boolean' &&
      typeof value['hasPackageJson'] === 'boolean' &&
      typeof value['hasTsConfig'] === 'boolean' &&
      typeof value['hasSrcDirectory'] === 'boolean' &&
      typeof value['hasPrismaSchema'] === 'boolean' &&
      typeof value['createdAt'] === 'string' &&
      typeof value['updatedAt'] === 'string'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
