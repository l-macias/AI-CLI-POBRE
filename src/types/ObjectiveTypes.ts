export interface RuntimeObjectiveInput {
  objective: string;
  module: string;
}

export interface RuntimeObjective {
  id: string;
  objective: string;
  module: string;
  createdAt: string;
  normalizedObjective: string;
}

export interface ObjectiveValidationResult {
  valid: boolean;
  issues: string[];
}
