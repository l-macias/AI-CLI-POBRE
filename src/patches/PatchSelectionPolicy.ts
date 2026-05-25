import type { PatchProposalOperation, PatchProposalRiskLevel } from './PatchProposal.js';
import { PatchRiskPolicy } from './PatchRiskPolicy.js';

export interface PatchSelectionPolicyInput {
  path: string;
  operation: PatchProposalOperation;
  totalFiles: number;
}

export class PatchSelectionPolicy {
  private readonly riskPolicy: PatchRiskPolicy;

  public constructor(riskPolicy = new PatchRiskPolicy()) {
    this.riskPolicy = riskPolicy;
  }

  public riskForFile(input: PatchSelectionPolicyInput): PatchProposalRiskLevel {
    return this.riskPolicy.riskForFile(input);
  }

  public userSelectableForFile(): true {
    return true;
  }
}
