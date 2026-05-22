export type PlanRiskLevel = 'low' | 'medium' | 'high';

export interface PlanStepViewModel {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'ready' | 'blocked' | 'completed';
  riskLevel: PlanRiskLevel;
  target?: string | undefined;
}

export interface PlanViewModel {
  id: string;
  title: string;
  summary: string;
  riskLevel: PlanRiskLevel;
  steps: PlanStepViewModel[];
}
