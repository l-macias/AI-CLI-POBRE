import type {
  PatchFileChange,
  PatchProposalRisk,
  PatchProposalRiskLevel,
} from './PatchProposal.js';
import { PatchRiskPolicy } from './PatchRiskPolicy.js';

export class PatchRiskAnalyzer {
  private readonly policy: PatchRiskPolicy;

  public constructor(policy = new PatchRiskPolicy()) {
    this.policy = policy;
  }

  public analyze(files: PatchFileChange[]): PatchProposalRisk[] {
    return this.policy.analyze(files).risks;
  }

  public highestRisk(risks: PatchProposalRisk[]): PatchProposalRiskLevel {
    return this.policy.highestRisk(risks);
  }
}
