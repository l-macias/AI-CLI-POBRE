export type RuntimePhase =
  | "idle"
  | "initializing"
  | "planning"
  | "executing"
  | "validating"
  | "recovering"
  | "completed"
  | "failed";

export interface RuntimeState {
  phase: RuntimePhase;
  objective: string | null;
  activeModule: string | null;
  currentStep: string | null;
  completedSteps: string[];
  pendingSteps: string[];
  knownIssues: string[];
}
