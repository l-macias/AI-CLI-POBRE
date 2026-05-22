import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createDefaultRuntimeSettings, type RuntimeSettings } from './RuntimeSettings.js';

export interface RuntimeSettingsStoreOptions {
  filePath?: string | undefined;
}

export class RuntimeSettingsStore {
  private readonly filePath: string;

  public constructor(options: RuntimeSettingsStoreOptions = {}) {
    this.filePath = resolve(options.filePath ?? '.runtime/settings/runtime-settings.json');
  }

  public async load(): Promise<RuntimeSettings> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed: unknown = JSON.parse(raw);

      if (!this.isRuntimeSettings(parsed)) {
        throw new Error(`Invalid runtime settings file: ${this.filePath}`);
      }

      return parsed;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        const defaults = createDefaultRuntimeSettings();

        await this.save(defaults);

        return defaults;
      }

      throw error;
    }
  }

  public async save(settings: RuntimeSettings): Promise<RuntimeSettings> {
    const normalized: RuntimeSettings = {
      ...settings,
      version: 1,
      provider: {
        ...settings.provider,
        apiKeyConfigured: Boolean(process.env['OPENROUTER_API_KEY']),
      },
      updatedAt: new Date().toISOString(),
    };

    await mkdir(dirname(this.filePath), {
      recursive: true,
    });

    await writeFile(this.filePath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');

    return normalized;
  }

  public resolvePath(): string {
    return this.filePath;
  }

  private isRuntimeSettings(value: unknown): value is RuntimeSettings {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      value['version'] === 1 &&
      this.isRecord(value['provider']) &&
      this.isRecord(value['model']) &&
      this.isRecord(value['workspace']) &&
      this.isRecord(value['github']) &&
      this.isRecord(value['protectedPaths']) &&
      this.isRecord(value['approval']) &&
      typeof value['updatedAt'] === 'string'
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
