import type { JsonObject } from '../types/SharedTypes.js';
import type { AgentProviderConfig } from './AgentProviderConfig.js';
import type { AgentProviderPolicyDecision } from './AgentProviderPolicy.js';

export interface AgentProviderAuditInput {
  config: AgentProviderConfig;
  decision: AgentProviderPolicyDecision;
  source: string;
}

export class AgentProviderAuditReporter {
  public toMetadata(input: AgentProviderAuditInput): JsonObject {
    const metadata: JsonObject = {
      source: input.source,
      provider: input.config.provider,
      requestedProvider: input.config.provider,
      selectedProvider: input.decision.allowed
        ? input.config.provider
        : input.decision.fallbackProvider,
      allowRealProvider: input.config.allowRealProvider,
      allowPremium: input.config.allowPremium,
      premiumApproved: input.config.premiumApproved,
      includeProjectMemory: input.config.includeProjectMemory,
      estimatedCompletionTokens: input.decision.estimatedCompletionTokens,
      policyStatus: input.decision.status,
      policyAllowed: input.decision.allowed,
      fallbackProvider: input.decision.fallbackProvider,
      issueCount: input.decision.issues.length,
      issues: input.decision.issues.map((issue) => {
        return {
          code: issue.code,
          message: issue.message,
          severity: issue.severity,
        };
      }),
    };

    if (input.config.providerModel) {
      metadata['requestedModel'] = input.config.providerModel;
    }

    if (input.decision.providerModel) {
      metadata['selectedModel'] = input.decision.providerModel;
    }

    if (input.decision.fallbackReason) {
      metadata['fallbackReason'] = input.decision.fallbackReason;
    }

    return metadata;
  }
}
