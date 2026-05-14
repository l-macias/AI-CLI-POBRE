import type { ToolIntent } from './ToolTypes.js';

export type PlanStepType =
  | 'inspect'
  | 'create_file'
  | 'edit_file'
  | 'run_command'
  | 'validate'
  | 'document'
  | 'checkpoint';

export type PlanRiskLevel = 'low' | 'medium' | 'high';

export type PlanReviewStatus =
  | 'generated'
  | 'validated'
  | 'rejected'
  | 'approved'
  | 'ready_for_execution';

export interface RuntimePlan {
  id: string;
  objectiveId: string;
  title: string;
  summary: string;
  riskLevel: PlanRiskLevel;
  steps: RuntimePlanStep[];
  createdAt: string;
}

export interface RuntimePlanStep {
  id: string;
  type: PlanStepType;
  title: string;
  description: string;
  target?: string | undefined;
  command?: string | undefined;
  expectedOutcome: string;
  requiresApproval: boolean;
  toolIntent?: ToolIntent | undefined;
}

export interface PlanValidationResult {
  valid: boolean;
  issues: PlanValidationIssue[];
}

export interface PlanValidationIssue {
  code: string;
  message: string;
  stepId?: string | undefined;
}

export interface RuntimePlanReview {
  plan: RuntimePlan;
  status: PlanReviewStatus;
  validation: PlanValidationResult;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | undefined;
  rejectedAt?: string | undefined;
  readyAt?: string | undefined;
  rejectionReason?: string | undefined;
}

export interface PlanGenerationInput {
  objectiveId: string;
  objective: string;
  module: string;
  runtimeContext: string;
}
