import { resolve } from 'node:path';
import type {
  TargetProjectAddInput,
  TargetProjectRemoveInput,
  TargetProjectUseInput,
  WorkspaceConfig,
  WorkspaceTargetProject,
} from './WorkspaceConfigTypes.js';
import { WorkspaceConfigLoader } from './WorkspaceConfigLoader.js';
import { WorkspaceConfigWriter } from './WorkspaceConfigWriter.js';

export interface TargetProjectManagerOptions {
  loader?: WorkspaceConfigLoader | undefined;
  writer?: WorkspaceConfigWriter | undefined;
}

export class TargetProjectManager {
  private readonly loader: WorkspaceConfigLoader;
  private readonly writer: WorkspaceConfigWriter;

  public constructor(options: TargetProjectManagerOptions = {}) {
    this.loader = options.loader ?? new WorkspaceConfigLoader();
    this.writer = options.writer ?? new WorkspaceConfigWriter();
  }

  public async add(
    input: TargetProjectAddInput,
    workspaceRoot: string = process.cwd(),
  ): Promise<WorkspaceConfig> {
    const config = await this.loader.load(workspaceRoot);
    const now = new Date().toISOString();
    const rootPath = resolve(input.rootPath);
    const id = this.createProjectId(input.name);
    const existingIndex = config.projects.findIndex((project) => project.id === id);

    const project: WorkspaceTargetProject = {
      id,
      name: input.name.trim(),
      rootPath,
      createdAt: existingIndex >= 0 ? (config.projects[existingIndex]?.createdAt ?? now) : now,
      updatedAt: now,
    };

    const projects =
      existingIndex >= 0
        ? config.projects.map((item, index) => (index === existingIndex ? project : item))
        : [...config.projects, project];

    const updatedConfig: WorkspaceConfig = {
      version: 1,
      currentProjectId: input.setCurrent === false ? config.currentProjectId : project.id,
      projects,
    };

    await this.writer.write(updatedConfig, workspaceRoot);

    return updatedConfig;
  }

  public async list(workspaceRoot: string = process.cwd()): Promise<WorkspaceConfig> {
    return this.loader.load(workspaceRoot);
  }

  public async current(
    workspaceRoot: string = process.cwd(),
  ): Promise<WorkspaceTargetProject | null> {
    const config = await this.loader.load(workspaceRoot);

    if (config.currentProjectId === null) {
      return null;
    }

    return config.projects.find((project) => project.id === config.currentProjectId) ?? null;
  }

  public async use(
    input: TargetProjectUseInput,
    workspaceRoot: string = process.cwd(),
  ): Promise<WorkspaceConfig> {
    const config = await this.loader.load(workspaceRoot);
    const project = this.findProject(config, input.projectRef);

    if (!project) {
      throw new Error(`Target project not found: ${input.projectRef}`);
    }

    const updatedConfig: WorkspaceConfig = {
      ...config,
      currentProjectId: project.id,
    };

    await this.writer.write(updatedConfig, workspaceRoot);

    return updatedConfig;
  }

  public async remove(
    input: TargetProjectRemoveInput,
    workspaceRoot: string = process.cwd(),
  ): Promise<WorkspaceConfig> {
    const config = await this.loader.load(workspaceRoot);
    const project = this.findProject(config, input.projectRef);

    if (!project) {
      throw new Error(`Target project not found: ${input.projectRef}`);
    }

    const projects = config.projects.filter((item) => item.id !== project.id);

    const updatedConfig: WorkspaceConfig = {
      version: 1,
      currentProjectId: config.currentProjectId === project.id ? null : config.currentProjectId,
      projects,
    };

    await this.writer.write(updatedConfig, workspaceRoot);

    return updatedConfig;
  }

  public findProject(
    config: WorkspaceConfig,
    projectRef: string,
  ): WorkspaceTargetProject | undefined {
    const normalizedRef = projectRef.trim().toLowerCase();

    return config.projects.find((project) => {
      return project.id === normalizedRef || project.name.trim().toLowerCase() === normalizedRef;
    });
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
