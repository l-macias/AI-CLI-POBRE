import type { RuntimePlan, RuntimePlanStep } from './PlanningTypes.js';
import type { ToolExecutionResult } from './ToolTypes.js';

export type ExecutionMode = 'single_step' | 'sequential';

export type ExecutionRunStatus =
  | 'created'
  | 'running'
  | 'completed'
  | 'blocked'
  | 'failed'
  | 'partially_completed';

export type StepExecutionStatus =
  | 'pending'
  | 'running'
  | 'executed'
  | 'blocked'
  | 'failed'
  | 'skipped'
  | 'rolled_back';

export interface ExecutionStepState {
  stepId: string;
  status: StepExecutionStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  result?: ToolExecutionResult | undefined;
  rollbackAvailable: boolean;
  rollbackReason?: string | undefined;
}

export interface ExecutionQueueItem {
  step: RuntimePlanStep;
  state: ExecutionStepState;
}

export interface ExecutionRun {
  id: string;
  planId: string;
  mode: ExecutionMode;
  status: ExecutionRunStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  steps: ExecutionStepState[];
}

export interface ExecutionEngineStepResult {
  run: ExecutionRun;
  step: ExecutionStepState;
  toolResult: ToolExecutionResult;
}

export interface ExecutionEngineSequentialResult {
  run: ExecutionRun;
  results: ExecutionEngineStepResult[];
}

export interface ExecutionEngineExecuteStepInput {
  plan: RuntimePlan;
  stepId: string;
}

export interface ExecutionHistoryEntry {
  runId: string;
  planId: string;
  stepId: string;
  status: StepExecutionStatus;
  toolName: string;
  toolStatus: ToolExecutionResult['status'];
  timestamp: string;
  issues: ToolExecutionResult['issues'];
}
