import { resolve } from 'node:path';
import type {
  TargetProjectResolveInput,
  TargetProjectResolveResult,
} from './WorkspaceConfigTypes.js';
import { TargetProjectManager } from './TargetProjectManager.js';

export interface TargetProjectResolverOptions {
  manager?: TargetProjectManager | undefined;
}

export class TargetProjectResolver {
  private readonly manager: TargetProjectManager;

  public constructor(options: TargetProjectResolverOptions = {}) {
    this.manager = options.manager ?? new TargetProjectManager();
  }

  public async resolve(input: TargetProjectResolveInput = {}): Promise<TargetProjectResolveResult> {
    if (input.explicitProjectRoot && input.explicitProjectRoot.trim().length > 0) {
      return {
        projectRoot: resolve(input.explicitProjectRoot),
        source: 'explicit',
      };
    }

    const project = await this.manager.current(input.workspaceRoot ?? process.cwd());

    if (!project) {
      throw new Error(
        'No project root provided and no current target project configured. Use --project or run project add/use first.',
      );
    }

    return {
      projectRoot: project.rootPath,
      source: 'workspace_current',
      project,
    };
  }
}
