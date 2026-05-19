import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { safeJsonStringify } from '../utils/safeJson.js';
import type { WorkspaceConfig } from './WorkspaceConfigTypes.js';
import { WorkspaceConfigLoader } from './WorkspaceConfigLoader.js';
import { WorkspaceConfigValidator } from './WorkspaceConfigValidator.js';

export interface WorkspaceConfigWriterOptions {
  loader?: WorkspaceConfigLoader | undefined;
  validator?: WorkspaceConfigValidator | undefined;
}

export class WorkspaceConfigWriter {
  private readonly loader: WorkspaceConfigLoader;
  private readonly validator: WorkspaceConfigValidator;

  public constructor(options: WorkspaceConfigWriterOptions = {}) {
    this.validator = options.validator ?? new WorkspaceConfigValidator();
    this.loader =
      options.loader ??
      new WorkspaceConfigLoader({
        validator: this.validator,
      });
  }

  public async write(
    config: WorkspaceConfig,
    workspaceRoot: string = process.cwd(),
  ): Promise<string> {
    this.validator.assertValid(config);

    const configPath = this.loader.resolveConfigPath(workspaceRoot);
    const serialized = safeJsonStringify(config);

    if (!serialized.ok) {
      throw new Error(`Failed to serialize workspace config: ${serialized.error.message}`);
    }

    await mkdir(dirname(configPath), {
      recursive: true,
    });

    await writeFile(configPath, `${serialized.value}\n`, 'utf8');

    return configPath;
  }
}
