export type RuntimeWorkflowStepId =
  | 'session'
  | 'prepare_workflow'
  | 'runtime_plan'
  | 'patch_proposal'
  | 'diff_preview'
  | 'snapshot'
  | 'sandbox'
  | 'recovery_prepare'
  | 'repaired_patch'
  | 'dry_run'
  | 'apply'
  | 'rollback'
  | 'verify'
  | 'report';

export type RuntimeWorkflowStepStatus = 'locked' | 'available' | 'active' | 'completed' | 'blocked';

export interface RuntimeWorkflowArtifactState {
  sessionStarted: boolean;
  workflowPrepared: boolean;
  planValid: boolean;
  planRejected: boolean;
  patchProposalValid: boolean;
  patchProposalRejected: boolean;
  diffReady: boolean;
  diffBlocked: boolean;

  sandboxPassed: boolean;
  sandboxFailed: boolean;
  sandboxBlocked: boolean;

  recoveryAvailable: boolean;
  recoveryPrepared: boolean;
  recoveryMaxAttemptsReached: boolean;
  repairedProposalGenerated: boolean;

  snapshotAvailable: boolean;
  dryRunCompleted: boolean;
  applyApplied: boolean;
  applyBlocked: boolean;
  applyFailed: boolean;
  rollbackDryRunCompleted: boolean;
  rollbackCompleted: boolean;
  rollbackBlocked: boolean;
  rollbackFailed: boolean;
  verifyCompleted: boolean;
  reportExported: boolean;
  riskLevel: 'low' | 'medium' | 'high' | null;
}

export interface RuntimeWorkflowStep {
  id: RuntimeWorkflowStepId;
  title: string;
  description: string;
  status: RuntimeWorkflowStepStatus;
  required: boolean;
  blockedReason?: string | undefined;
}

export interface RuntimeWorkflowState {
  steps: RuntimeWorkflowStep[];
  currentStepId: RuntimeWorkflowStepId;
  completed: number;
  total: number;
  percentage: number;
  snapshotRequired: boolean;
  canContinue: boolean;
  blockedReasons: string[];
}
