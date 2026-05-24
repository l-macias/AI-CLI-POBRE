import type { RuntimeActionAvailability, RuntimeWorkflowState } from '../../types/runtime';

export type WorkflowStepStatus = 'locked' | 'available' | 'active' | 'completed' | 'blocked';

export interface WorkflowStepViewModel {
  id: string;
  title: string;
  description: string;
  status: WorkflowStepStatus;
  reason?: string | undefined;
  targetPanelId?: string | undefined;
}

export interface NextWorkflowAction {
  title: string;
  description: string;
  buttonLabel: string;
  disabled: boolean;
  blockedReason?: string | undefined;
  onRun: () => void;
  secondaryButtonLabel?: string | undefined;
  onRunSecondary?: (() => void) | undefined;
}

export interface WorkflowProgressViewModel {
  steps: WorkflowStepViewModel[];
  completed: number;
  total: number;
  percentage: number;
  currentStepTitle: string;
}
export interface RuntimeWorkflowViewModel {
  workflow: RuntimeWorkflowState;
  nextAction: RuntimeActionAvailability;
}
