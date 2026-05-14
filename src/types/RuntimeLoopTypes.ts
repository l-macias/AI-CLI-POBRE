import type {
  ExecutionEngineSequentialResult,
  ExecutionEngineStepResult,
} from './ExecutionTypes.js';
import type { FailureRecoveryResult } from './FailureTypes.js';
import type { RuntimeObjectiveInput } from './ObjectiveTypes.js';
import type { RuntimePlan, RuntimePlanReview } from './PlanningTypes.js';

export type RuntimeLoopStatus =
  | 'created'
  | 'objective_accepted'
  | 'plan_generated'
  | 'plan_approved'
  | 'ready_for_execution'
  | 'step_executed'
  | 'recovery_evaluated'
  | 'completed'
  | 'blocked'
  | 'failed';

export interface RuntimeLoopRunInput {
  objective: RuntimeObjectiveInput;
  maxSteps?: number | undefined;
  autoApprove?: boolean | undefined;
  recoveryDepth?: number | undefined;
}

export interface RuntimeLoopState {
  id: string;
  status: RuntimeLoopStatus;
  createdAt: string;
  updatedAt: string;
  objective?: RuntimeObjectiveInput | undefined;
  plan?: RuntimePlan | undefined;
  review?: RuntimePlanReview | undefined;
  stepResult?: ExecutionEngineStepResult | undefined;
  sequentialResult?: ExecutionEngineSequentialResult | undefined;
  recoveryResult?: FailureRecoveryResult | undefined;
  issues: string[];
}

export interface RuntimeLoopRunResult {
  state: RuntimeLoopState;
}
