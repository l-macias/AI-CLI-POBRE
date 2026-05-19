import type { CliAgentCommand, CliRepairProvider } from '../cli/CliTypes.js';
import type { FakeLlmRepairProposalMode } from '../repair/FakeLlmRepairProposalProvider.js';
import type { JsonObject } from '../types/SharedTypes.js';
import {
  agentProviderConfigToMetadata,
  defaultAgentProviderConfig,
  type AgentProviderConfig,
} from './AgentProviderConfig.js';

const knownProviders = new Set<CliRepairProvider>(['fake-llm', 'static', 'openrouter']);

const knownFakeProviderModes = new Set<FakeLlmRepairProposalMode>([
  'json_only',
  'markdown_json',
  'text_around_json',
  'invalid_json',
  'invalid_schema',
]);

export class AgentProviderConfigReader {
  public fromCliCommand(command: CliAgentCommand): AgentProviderConfig {
    return {
      provider: command.provider,
      fakeProviderMode: command.fakeProviderMode,
      providerModel: command.providerModel,
      estimatedCompletionTokens: command.estimatedCompletionTokens,
      allowRealProvider: command.allowRealProvider,
      allowPremium: command.allowPremium,
      premiumApproved: command.premiumApproved,
      includeProjectMemory: command.includeProjectMemory,
    };
  }

  public fromMetadata(metadata: JsonObject | undefined): AgentProviderConfig {
    if (!metadata) {
      return defaultAgentProviderConfig;
    }

    return {
      provider: this.readProvider(metadata['provider']),
      fakeProviderMode: this.readFakeProviderMode(metadata['fakeProviderMode']),
      providerModel: this.readOptionalString(metadata['providerModel']),
      estimatedCompletionTokens: this.readOptionalPositiveInteger(
        metadata['estimatedCompletionTokens'],
      ),
      allowRealProvider: metadata['allowRealProvider'] === true,
      allowPremium: metadata['allowPremium'] === true,
      premiumApproved: metadata['premiumApproved'] === true,
      includeProjectMemory: metadata['includeProjectMemory'] === true,
    };
  }

  public toMetadata(config: AgentProviderConfig): JsonObject {
    return agentProviderConfigToMetadata(config);
  }

  private readProvider(value: unknown): CliRepairProvider {
    if (typeof value === 'string' && knownProviders.has(value as CliRepairProvider)) {
      return value as CliRepairProvider;
    }

    return defaultAgentProviderConfig.provider;
  }

  private readFakeProviderMode(value: unknown): FakeLlmRepairProposalMode {
    if (
      typeof value === 'string' &&
      knownFakeProviderModes.has(value as FakeLlmRepairProposalMode)
    ) {
      return value as FakeLlmRepairProposalMode;
    }

    return defaultAgentProviderConfig.fakeProviderMode;
  }

  private readOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  private readOptionalPositiveInteger(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return undefined;
    }

    return Math.floor(value);
  }
}
