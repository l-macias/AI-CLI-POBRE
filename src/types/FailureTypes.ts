import type { ExecutionEngineStepResult } from './ExecutionTypes.js';
import type { RuntimeObjectiveInput } from './ObjectiveTypes.js';
import type { RuntimeLoopState } from './RuntimeLoopTypes.js';
import type { ToolExecutionValidationIssue } from './ToolTypes.js';

export type FailureKind =
  | 'none'
  | 'plan_validation_failed'
  | 'tool_blocked'
  | 'tool_failed'
  | 'permission_denied'
  | 'protected_path'
  | 'step_already_executed'
  | 'missing_step'
  | 'no_pending_steps'
  | 'loop_detected'
  | 'recursive_failure'
  | 'unknown';

export type FailureRecoveryAction = 'none' | 'retry_step' | 'replan' | 'block';

export interface RuntimeFailure {
  id: string;
  kind: FailureKind;
  message: string;
  stepId?: string | undefined;
  planId?: string | undefined;
  issues: ToolExecutionValidationIssue[];
  createdAt: string;
  retryable: boolean;
  replanAllowed: boolean;
}

export interface FailureClassificationInput {
  stepResult?: ExecutionEngineStepResult | undefined;
  error?: unknown;
}

export interface FailureRecoveryInput {
  loopState: RuntimeLoopState;
  stepResult?: ExecutionEngineStepResult | undefined;
  error?: unknown;
  depth: number;
}

export interface FailureRecoveryResult {
  recovered: boolean;
  action: FailureRecoveryAction;
  failure: RuntimeFailure;
  reason: string;
  suggestedObjective?: RuntimeObjectiveInput | undefined;
  createdAt: string;
}

export interface FailureHistoryEntry {
  failure: RuntimeFailure;
  action: FailureRecoveryAction;
  recovered: boolean;
  reason: string;
  timestamp: string;
}
