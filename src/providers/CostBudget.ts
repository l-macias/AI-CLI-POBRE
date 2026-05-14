import type {
  CostBudgetLimit,
  ModelBudgetIssue,
  ModelCostEstimate,
} from '../types/ModelBudgetTypes.js';

export class CostBudget {
  private readonly limit: CostBudgetLimit;

  public constructor(limit: CostBudgetLimit) {
    this.limit = limit;
  }

  public checkEstimate(estimate: ModelCostEstimate): ModelBudgetIssue[] {
    if (estimate.estimatedUsd > this.limit.maxEstimatedUsd) {
      return [
        {
          code: 'ESTIMATED_COST_BUDGET_EXCEEDED',
          message: `Estimated cost ${estimate.estimatedUsd.toFixed(
            8,
          )} USD exceeds per-call limit ${this.limit.maxEstimatedUsd.toFixed(8)} USD.`,
          severity: 'error',
        },
      ];
    }

    return [];
  }

  public checkSessionCost(currentSessionUsd: number): ModelBudgetIssue[] {
    if (currentSessionUsd > this.limit.maxSessionUsd) {
      return [
        {
          code: 'SESSION_COST_BUDGET_EXCEEDED',
          message: `Session cost ${currentSessionUsd.toFixed(
            8,
          )} USD exceeds session limit ${this.limit.maxSessionUsd.toFixed(8)} USD.`,
          severity: 'error',
        },
      ];
    }

    return [];
  }
}
