import type { CliRepairProvider } from '../cli/CliTypes.js';
import type { FakeLlmRepairProposalMode } from '../repair/FakeLlmRepairProposalProvider.js';
import type { JsonObject } from '../types/SharedTypes.js';

export interface AgentProviderConfig {
  provider: CliRepairProvider;
  fakeProviderMode: FakeLlmRepairProposalMode;
  providerModel?: string | undefined;
  estimatedCompletionTokens?: number | undefined;
  allowRealProvider: boolean;
  allowPremium: boolean;
  premiumApproved: boolean;
  includeProjectMemory: boolean;
}

export const defaultAgentProviderConfig: AgentProviderConfig = {
  provider: 'fake-llm',
  fakeProviderMode: 'markdown_json',
  allowRealProvider: false,
  allowPremium: false,
  premiumApproved: false,
  includeProjectMemory: false,
};

export function agentProviderConfigToMetadata(config: AgentProviderConfig): JsonObject {
  const metadata: JsonObject = {
    provider: config.provider,
    fakeProviderMode: config.fakeProviderMode,
    allowRealProvider: config.allowRealProvider,
    allowPremium: config.allowPremium,
    premiumApproved: config.premiumApproved,
    includeProjectMemory: config.includeProjectMemory,
  };

  if (typeof config.providerModel === 'string' && config.providerModel.trim().length > 0) {
    metadata['providerModel'] = config.providerModel;
  }

  if (
    typeof config.estimatedCompletionTokens === 'number' &&
    Number.isFinite(config.estimatedCompletionTokens) &&
    config.estimatedCompletionTokens > 0
  ) {
    metadata['estimatedCompletionTokens'] = Math.floor(config.estimatedCompletionTokens);
  }

  return metadata;
}
