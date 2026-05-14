import type { RuntimePlan, PlanStepType } from '../types/PlanningTypes.js';

const stepOrder: Record<PlanStepType, number> = {
  inspect: 1,
  document: 2,
  create_file: 3,
  edit_file: 4,
  run_command: 5,
  validate: 6,
  checkpoint: 7,
};

export class PlanOptimizer {
  public optimize(plan: RuntimePlan): RuntimePlan {
    return {
      ...plan,
      steps: [...plan.steps].sort((a, b) => {
        return stepOrder[a.type] - stepOrder[b.type];
      }),
    };
  }
}
