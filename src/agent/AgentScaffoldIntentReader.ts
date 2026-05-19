import type { ScaffoldModuleKind } from '../scaffold/ScaffoldTypes.js';
import type { JsonObject } from '../types/SharedTypes.js';
import type { CliRepairProvider } from '../cli/CliTypes.js';

export interface AgentScaffoldIntentConfig {
  name: string;
  moduleKind: ScaffoldModuleKind;
  targetPath: string;
  provider: CliRepairProvider;
  providerModel?: string | undefined;
  allowRealProvider: boolean;
  allowPremium: boolean;
  premiumApproved: boolean;
  includeProjectMemory: boolean;
  overwriteExisting: boolean;
  dryRun: boolean;
}

const knownModuleKinds = new Set<ScaffoldModuleKind>([
  'backend',
  'frontend',
  'fullstack',
  'library',
  'generic',
]);

const knownProviders = new Set<CliRepairProvider>(['fake-llm', 'static', 'openrouter']);

export class AgentScaffoldIntentReader {
  public fromMetadata(metadata: JsonObject | undefined): AgentScaffoldIntentConfig {
    const name = this.readRequiredString(metadata, 'scaffoldModuleName');
    const targetPath = this.readRequiredString(metadata, 'scaffoldTargetPath');

    return {
      name,
      moduleKind: this.readModuleKind(metadata?.['scaffoldModuleKind']),
      targetPath,
      provider: this.readProvider(metadata?.['scaffoldProvider']),
      providerModel: this.readOptionalString(metadata?.['scaffoldProviderModel']),
      allowRealProvider: metadata?.['scaffoldAllowRealProvider'] === true,
      allowPremium: metadata?.['scaffoldAllowPremium'] === true,
      premiumApproved: metadata?.['scaffoldPremiumApproved'] === true,
      includeProjectMemory: metadata?.['includeProjectMemory'] === true,
      overwriteExisting: metadata?.['scaffoldOverwriteExisting'] === true,
      dryRun: metadata?.['scaffoldDryRun'] !== false,
    };
  }

  private readRequiredString(metadata: JsonObject | undefined, key: string): string {
    const value = metadata?.[key];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    throw new Error(`Agent scaffold metadata is missing required string: ${key}`);
  }

  private readOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  private readModuleKind(value: unknown): ScaffoldModuleKind {
    if (typeof value === 'string' && knownModuleKinds.has(value as ScaffoldModuleKind)) {
      return value as ScaffoldModuleKind;
    }

    return 'generic';
  }

  private readProvider(value: unknown): CliRepairProvider {
    if (typeof value === 'string' && knownProviders.has(value as CliRepairProvider)) {
      return value as CliRepairProvider;
    }

    return 'fake-llm';
  }
}
