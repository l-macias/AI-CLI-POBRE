export type PlanRiskLevel = 'low' | 'medium' | 'high';

export interface PlanStepViewModel {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'ready' | 'blocked' | 'completed';
  riskLevel: PlanRiskLevel;
  target?: string | undefined;
  requiresApproval?: boolean | undefined;
}

export interface PlanViewModel {
  id: string;
  title: string;
  summary: string;
  riskLevel: PlanRiskLevel;
  status?: string | undefined;
  needsSnapshot?: boolean | undefined;
  requiresApproval?: boolean | undefined;
  steps: PlanStepViewModel[];
  risks?: {
    code: string;
    level: PlanRiskLevel;
    message: string;
    mitigation: string;
  }[];
  verifyCommands?: {
    command: string;
    args: string[];
    reason: string;
    requiresApproval: true;
  }[];
  candidateFiles?: {
    path: string;
    reason: string;
    existsKnown: boolean;
  }[];
  validationIssues?: {
    code: string;
    message: string;
    severity: 'error' | 'warning';
    path?: string | undefined;
  }[];
}
