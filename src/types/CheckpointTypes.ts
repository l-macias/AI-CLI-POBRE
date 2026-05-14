export interface RuntimeCheckpoint {
  id: string;
  createdAt: string;
  projectName: string;
  sessionName: string;
  activeModule: string;
  summary: string;
  files: RuntimeCheckpointFiles;
}

export interface RuntimeCheckpointFiles {
  currentState: string | null;
  activeModule: string | null;
  decisions: string | null;
  nextSteps: string | null;
  progressLog: string | null;
  handoff: string | null;
}

export interface RestoredSessionContext {
  currentState: string | null;
  activeModule: string | null;
  decisions: string | null;
  nextSteps: string | null;
  progressLog: string | null;
  handoff: string | null;
  compactSummary: string;
}
