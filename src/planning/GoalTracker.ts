import type { RuntimePlan } from '../types/PlanningTypes.js';

export interface GoalTrackingSummary {
  objectiveId: string;
  totalSteps: number;
  approvalRequiredSteps: number;
  commandSteps: number;
  validationSteps: number;
}

export class GoalTracker {
  public summarize(plan: RuntimePlan): GoalTrackingSummary {
    return {
      objectiveId: plan.objectiveId,
      totalSteps: plan.steps.length,
      approvalRequiredSteps: plan.steps.filter((step) => step.requiresApproval).length,
      commandSteps: plan.steps.filter((step) => step.type === 'run_command').length,
      validationSteps: plan.steps.filter((step) => step.type === 'validate').length,
    };
  }
}
