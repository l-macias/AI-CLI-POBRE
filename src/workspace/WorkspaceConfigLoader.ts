import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { safeJsonParse } from '../utils/safeJson.js';
import { createEmptyWorkspaceConfig } from './WorkspaceConfigDefaults.js';
import type { WorkspaceConfig } from './WorkspaceConfigTypes.js';
import { WorkspaceConfigValidator } from './WorkspaceConfigValidator.js';

export interface WorkspaceConfigLoaderOptions {
  validator?: WorkspaceConfigValidator | undefined;
}

export class WorkspaceConfigLoader {
  private readonly validator: WorkspaceConfigValidator;

  public constructor(options: WorkspaceConfigLoaderOptions = {}) {
    this.validator = options.validator ?? new WorkspaceConfigValidator();
  }

  public async load(workspaceRoot: string = process.cwd()): Promise<WorkspaceConfig> {
    const configPath = this.resolveConfigPath(workspaceRoot);

    if (!(await this.exists(configPath))) {
      return createEmptyWorkspaceConfig();
    }

    const raw = await readFile(configPath, 'utf8');
    const parsed = safeJsonParse(raw);

    if (!parsed.ok) {
      throw new Error(`Invalid workspace config JSON: ${parsed.error.message}`);
    }

    const validation = this.validator.validate(parsed.value);

    if (!validation.valid) {
      throw new Error(
        `Invalid workspace config: ${validation.issues
          .map((issue) => `${issue.code}: ${issue.message}`)
          .join('; ')}`,
      );
    }

    return parsed.value as unknown as WorkspaceConfig;
  }

  public resolveConfigPath(workspaceRoot: string = process.cwd()): string {
    return resolve(workspaceRoot, '.runtime/workspace-config.json');
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
