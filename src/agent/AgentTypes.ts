import type { JsonObject } from '../types/SharedTypes.js';

export type AgentLoopStatus =
  | 'created'
  | 'waiting_for_user'
  | 'running'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type AgentTurnRole = 'user' | 'runtime' | 'assistant' | 'system';

export type AgentActionKind =
  | 'inspect_project'
  | 'validate_project'
  | 'check_git'
  | 'build_repair_context'
  | 'request_repair_proposal'
  | 'show_diff_preview'
  | 'request_approval'
  | 'apply_patch'
  | 'revalidate_project'
  | 'report_result'
  | 'cancel'
  | 'scaffold_module';

export type AgentDecisionStatus = 'pending' | 'selected' | 'executed' | 'skipped' | 'blocked';

export type AgentApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type AgentApprovalScope = 'patch_apply';

export interface AgentLoopInput {
  id?: string | undefined;
  objective: string;
  projectRoot: string;
  projectName: string;
  targetFiles: string[];
  createdBy?: string | undefined;
  metadata?: JsonObject | undefined;
}

export interface AgentTurn {
  id: string;
  role: AgentTurnRole;
  message: string;
  createdAt: string;
  metadata?: JsonObject | undefined;
}

export interface AgentAction {
  id: string;
  kind: AgentActionKind;
  label: string;
  description: string;
  status: AgentDecisionStatus;
  requiresApproval: boolean;
  createdAt: string;
  completedAt?: string | undefined;
  metadata?: JsonObject | undefined;
}

export interface AgentDecision {
  id: string;
  actionId: string;
  selected: boolean;
  reason: string;
  createdAt: string;
  metadata?: JsonObject | undefined;
}

export interface AgentApprovalRequest {
  id: string;
  scope: AgentApprovalScope;
  status: AgentApprovalStatus;
  actionId: string;
  reason: string;
  requestedAt: string;
  decidedAt?: string | undefined;
  decisionReason?: string | undefined;
  metadata?: JsonObject | undefined;
}

export interface AgentLoopState {
  id: string;
  status: AgentLoopStatus;
  objective: string;
  projectRoot: string;
  projectName: string;
  targetFiles: string[];
  turns: AgentTurn[];
  actions: AgentAction[];
  decisions: AgentDecision[];
  approvals: AgentApprovalRequest[];
  issues: AgentLoopIssue[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | undefined;
  metadata?: JsonObject | undefined;
}

export interface AgentLoopIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface AgentLoopReport {
  id: string;
  status: AgentLoopStatus;
  objective: string;
  projectRoot: string;
  projectName: string;
  turns: AgentTurn[];
  actions: AgentAction[];
  decisions: AgentDecision[];
  approvals: AgentApprovalRequest[];
  issues: AgentLoopIssue[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | undefined;
}

export interface AgentStepExecutionResult {
  actionId: string;
  actionKind: AgentActionKind;
  status: 'executed' | 'blocked' | 'failed';
  message: string;
  summary: JsonObject;
  createdAt: string;
}
