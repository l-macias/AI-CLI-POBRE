import type { PatchProposalOperation, PatchProposalRiskLevel } from './PatchProposal.js';

export interface PatchFileReview {
  path: string;
  operation: PatchProposalOperation;
  reason: string;
  changesSummary: string[];
  riskLevel: PatchProposalRiskLevel;
  userSelectable: true;
}
