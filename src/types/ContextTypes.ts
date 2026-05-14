export interface RuntimeContextSource {
  name: string;
  content: string | null;
  priority: RuntimeContextPriority;
}

export type RuntimeContextPriority = 'critical' | 'high' | 'medium' | 'low';

export interface RuntimeContext {
  sources: RuntimeContextSource[];
  assembledContext: string;
  tokenEstimate: number;
}

export interface ContextAssemblyOptions {
  maxEstimatedTokens: number;
}
