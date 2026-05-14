import type { RetrievalResult } from './RetrievalTypes.js';

export interface RetrievalPlanningContextInput {
  objective: string;
  module: string;
  maxChunks?: number | undefined;
}

export interface RetrievalPlanningContext {
  query: string;
  context: string;
  retrieval: RetrievalResult;
  createdAt: string;
}
