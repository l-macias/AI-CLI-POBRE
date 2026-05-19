import { resolve } from 'node:path';
import type {
  WorkspaceConfig,
  WorkspaceConfigIssue,
  WorkspaceConfigValidationResult,
} from './WorkspaceConfigTypes.js';

interface WorkspaceConfigShape {
  version?: unknown;
  currentProjectId?: unknown;
  projects?: unknown;
}

interface WorkspaceTargetProjectShape {
  id?: unknown;
  name?: unknown;
  rootPath?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export class WorkspaceConfigValidator {
  public validate(value: unknown): WorkspaceConfigValidationResult {
    const issues: WorkspaceConfigIssue[] = [];

    if (!this.isObject(value)) {
      return {
        valid: false,
        issues: [
          {
            code: 'WORKSPACE_CONFIG_NOT_OBJECT',
            message: 'Workspace config must be an object.',
            severity: 'error',
          },
        ],
      };
    }

    const config = value as WorkspaceConfigShape;

    if (config.version !== 1) {
      issues.push({
        code: 'WORKSPACE_CONFIG_VERSION_INVALID',
        message: 'Workspace config version must be 1.',
        severity: 'error',
      });
    }

    if (config.currentProjectId !== null && typeof config.currentProjectId !== 'string') {
      issues.push({
        code: 'WORKSPACE_CURRENT_PROJECT_INVALID',
        message: 'currentProjectId must be string or null.',
        severity: 'error',
      });
    }

    if (!Array.isArray(config.projects)) {
      issues.push({
        code: 'WORKSPACE_PROJECTS_INVALID',
        message: 'projects must be an array.',
        severity: 'error',
      });

      return {
        valid: false,
        issues,
      };
    }

    this.validateProjects(config.projects, config.currentProjectId, issues);

    return {
      valid: !issues.some((issue) => issue.severity === 'error'),
      issues,
    };
  }

  public assertValid(config: WorkspaceConfig): void {
    const result = this.validate(config);

    if (!result.valid) {
      throw new Error(result.issues.map((issue) => `${issue.code}: ${issue.message}`).join('; '));
    }
  }

  private validateProjects(
    projects: unknown[],
    currentProjectId: unknown,
    issues: WorkspaceConfigIssue[],
  ): void {
    const seenIds = new Set<string>();

    for (const [index, rawProject] of projects.entries()) {
      if (!this.isObject(rawProject)) {
        issues.push({
          code: 'WORKSPACE_PROJECT_INVALID',
          message: `Project at index ${index} must be an object.`,
          severity: 'error',
        });
        continue;
      }

      const project = rawProject as WorkspaceTargetProjectShape;

      this.validateRequiredString(project.id, `projects[${index}].id`, issues);
      this.validateRequiredString(project.name, `projects[${index}].name`, issues);
      this.validateRequiredString(project.rootPath, `projects[${index}].rootPath`, issues);
      this.validateRequiredString(project.createdAt, `projects[${index}].createdAt`, issues);
      this.validateRequiredString(project.updatedAt, `projects[${index}].updatedAt`, issues);

      if (typeof project.id === 'string') {
        if (seenIds.has(project.id)) {
          issues.push({
            code: 'WORKSPACE_PROJECT_ID_DUPLICATED',
            message: `Duplicated project id: ${project.id}`,
            severity: 'error',
          });
        }

        seenIds.add(project.id);
      }

      if (typeof project.rootPath === 'string' && resolve(project.rootPath) !== project.rootPath) {
        issues.push({
          code: 'WORKSPACE_PROJECT_PATH_NOT_ABSOLUTE',
          message: `Project rootPath must be absolute: ${project.rootPath}`,
          severity: 'error',
        });
      }
    }

    if (typeof currentProjectId === 'string' && !seenIds.has(currentProjectId)) {
      issues.push({
        code: 'WORKSPACE_CURRENT_PROJECT_NOT_FOUND',
        message: `currentProjectId does not match any project: ${currentProjectId}`,
        severity: 'error',
      });
    }
  }

  private validateRequiredString(
    value: unknown,
    path: string,
    issues: WorkspaceConfigIssue[],
  ): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      issues.push({
        code: 'WORKSPACE_REQUIRED_STRING_INVALID',
        message: `${path} must be a non-empty string.`,
        severity: 'error',
      });
    }
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
