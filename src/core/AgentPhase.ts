export type AgentPhase =
  | 'idle'
  | 'initializing'
  | 'context_loading'
  | 'ready'
  | 'planning'
  | 'executing'
  | 'validating'
  | 'recovering'
  | 'completed'
  | 'failed';

export const initialAgentPhase: AgentPhase = 'idle';
