import type { RuntimeContextSource } from './ContextTypes.js';

export type MemoryImportance = 'critical' | 'high' | 'medium' | 'low';

export interface CompressionPolicyOptions {
  maxSourceCharacters: number;
  maxBulletPoints: number;
  preserveHeadings: boolean;
}

export interface ContextCompressionInput {
  sources: RuntimeContextSource[];
  policy?: Partial<CompressionPolicyOptions> | undefined;
}

export interface CompressedContextSource {
  name: string;
  priority: RuntimeContextSource['priority'];
  originalCharacters: number;
  compressedCharacters: number;
  content: string;
}

export interface ContextCompressionResult {
  compressedSources: CompressedContextSource[];
  compressedContext: string;
  originalCharacters: number;
  compressedCharacters: number;
  compressionRatio: number;
  createdAt: string;
}

export interface RuntimeSummaryInput {
  projectName: string;
  currentState: string | null;
  activeModule: string | null;
  nextSteps: string | null;
  decisions: string | null;
  progressLog: string | null;
}

export interface RuntimeSummary {
  createdAt: string;
  projectName: string;
  status: string;
  activeModule: string;
  nextStep: string;
  keyDecisions: string[];
  recentProgress: string[];
}
