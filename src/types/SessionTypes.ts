export interface RuntimeSessionState {
  projectName: string;
  sessionName: string;
  objective: string;
  activeModule: string;
  status: RuntimeSessionStatus;
  completed: string[];
  inProgress: string[];
  pending: string[];
  knownIssues: string[];
}

export type RuntimeSessionStatus =
  | 'initialized'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'failed';

export interface RuntimeDecision {
  id: string;
  title: string;
  description: string;
}

export interface ProgressEntry {
  session: string;
  message: string;
  timestamp: string;
}

export interface HandoffInput {
  summary: string;
  importantContext: string[];
  resumeFrom: string;
}
