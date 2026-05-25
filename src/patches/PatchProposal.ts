export type PatchProposalOperation = 'modify' | 'create' | 'delete';

export type PatchProposalRiskLevel = 'low' | 'medium' | 'high';

export type PatchProposalStatus = 'generated' | 'validated' | 'rejected';

export interface PatchFileChange {
  path: string;
  operation: PatchProposalOperation;
  beforeHash: string | null;
  content: string | null;
  reason: string;
  changesSummary: string[];
  riskLevel: PatchProposalRiskLevel;
  userSelectable: true;
}

export interface PatchProposalRisk {
  code: string;
  level: PatchProposalRiskLevel;
  message: string;
  mitigation: string;
}

export interface PatchProposalVerifyCommand {
  command: 'npm' | 'tsc';
  args: string[];
  reason: string;
  requiresApproval: true;
}

export interface RuntimePatchProposal {
  id: string;
  planId: string;
  sessionId: string;
  projectRoot: string;
  summary: string;
  files: PatchFileChange[];
  risks: PatchProposalRisk[];
  verifyCommands: PatchProposalVerifyCommand[];
  riskLevel: PatchProposalRiskLevel;
  requiresApproval: true;
  status: PatchProposalStatus;
  createdAt: string;
}

export interface PatchProposalGenerationInput {
  planId: string;
  sessionId: string;
  projectRoot: string;
  summary: string;
  candidateFiles: {
    path: string;
    content?: string | undefined;
    existsKnown: boolean;
    reason: string;
  }[];
  riskLevel: PatchProposalRiskLevel;
  verifyCommands: PatchProposalVerifyCommand[];
}

export interface PatchProposalValidationIssue {
  code: string;
  message: string;
  path?: string | undefined;
  severity: 'error' | 'warning';
}

export interface PatchProposalValidationResult {
  valid: boolean;
  issues: PatchProposalValidationIssue[];
}

export interface PatchProposalGenerationResult {
  proposal: RuntimePatchProposal;
  validation: PatchProposalValidationResult;
}
