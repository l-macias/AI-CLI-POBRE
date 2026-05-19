import type {
  RepairProposalProvider,
  RepairProposalProviderResult,
} from './RepairProposalProvider.js';
import type { PatchProposal } from '../types/RepairTypes.js';

export class StaticRepairProposalProvider implements RepairProposalProvider {
  private readonly proposal: PatchProposal;

  public constructor(proposal: PatchProposal) {
    this.proposal = proposal;
  }

  public propose(): Promise<RepairProposalProviderResult> {
    return Promise.resolve({
      proposal: this.proposal,
      modelUsage: {
        provider: 'static',
        model: 'static-repair-proposal',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedUsd: 0,
      },
    });
  }
}
