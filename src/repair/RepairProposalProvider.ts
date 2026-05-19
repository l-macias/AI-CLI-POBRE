import type { PatchProposal, RepairModelUsage, RepairRequest } from '../types/RepairTypes.js';
import type { RepairModelPolicyDecision } from '../types/RepairModelPolicyTypes.js';

export interface RepairProposalProviderResult {
  proposal: PatchProposal;
  modelUsage?: RepairModelUsage | undefined;
  modelPolicyDecision?: RepairModelPolicyDecision | undefined;
  providerFallbackUsed?: boolean | undefined;
  providerFallbackReason?: string | undefined;
}

export interface RepairProposalProvider {
  propose(input: { request: RepairRequest; prompt: string }): Promise<RepairProposalProviderResult>;
}
