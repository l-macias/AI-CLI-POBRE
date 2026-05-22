export type RuntimePlanRiskLevel = 'low' | 'medium' | 'high';

export type RuntimePlanStatus = 'generated' | 'validated' | 'rejected';

export type RuntimePlanStepKind =
  | 'inspect'
  | 'context'
  | 'question'
  | 'snapshot'
  | 'plan'
  | 'patch'
  | 'approval'
  | 'verify'
  | 'report';

export interface RuntimePlanVerifyCommand {
  command: 'npm' | 'tsc';
  args: string[];
  reason: string;
  requiresApproval: true;
}

export interface RuntimePlanCandidateFile {
  path: string;
  reason: string;
  existsKnown: boolean;
}

export interface RuntimePlanRisk {
  code: string;
  level: RuntimePlanRiskLevel;
  message: string;
  mitigation: string;
}

export interface RuntimePlanStep {
  id: string;
  kind: RuntimePlanStepKind;
  title: string;
  description: string;
  requiresApproval: boolean;
}

export interface RuntimePlanScope {
  summary: string;
  includedAreas: string[];
  excludedAreas: string[];
  candidateFiles: RuntimePlanCandidateFile[];
}

export interface RuntimePlan {
  id: string;
  sessionId: string;
  projectRoot: string;
  projectName: string;
  objective: string;
  scope: RuntimePlanScope;
  steps: RuntimePlanStep[];
  risks: RuntimePlanRisk[];
  verifyCommands: RuntimePlanVerifyCommand[];
  needsSnapshot: boolean;
  requiresApproval: boolean;
  riskLevel: RuntimePlanRiskLevel;
  status: RuntimePlanStatus;
  createdAt: string;
}

export interface RuntimePlanGenerationInput {
  sessionId: string;
  projectRoot: string;
  projectName: string;
  instruction: string;
  workspaceMode: string;
  stack?: string[] | undefined;
  knownFiles?: string[] | undefined;
}

export interface RuntimePlanValidationIssue {
  code: string;
  message: string;
  path?: string | undefined;
  severity: 'error' | 'warning';
}

export interface RuntimePlanValidationResult {
  valid: boolean;
  issues: RuntimePlanValidationIssue[];
}

export interface RuntimePlanGenerationResult {
  plan: RuntimePlan;
  validation: RuntimePlanValidationResult;
}
export type RuntimePlanSource = 'runtime' | 'provider' | 'fallback';

export interface RuntimePlanGenerationEnvelope {
  source: RuntimePlanSource;
  result: RuntimePlanGenerationResult;
  providerAudit?: {
    provider: string;
    model: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    generatedAt: string;
  };
  fallbackReason?: string;
}
