import type { JsonObject } from '../types/SharedTypes.js';

export type SuggestionPriority = 'low' | 'medium' | 'high';

export type SuggestionCategory =
  | 'project'
  | 'error'
  | 'architecture'
  | 'workspace'
  | 'security'
  | 'snapshot';

export interface RuntimeSuggestion {
  id: string;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  title: string;
  description: string;
  recommendedCommand?: string | undefined;
  metadata?: JsonObject | undefined;
}

export interface SuggestionScanInput {
  projectRoot: string;
  projectName?: string | undefined;
  stack?: string[] | undefined;
  workspaceMode?: string | undefined;
  gitAvailable?: boolean | undefined;
  snapshotAvailable?: boolean | undefined;
  runtimeActions?:
    | {
        title: string;
        description: string;
        status: string;
      }[]
    | undefined;
  errors?: string[] | undefined;
}

export interface SuggestionScanResult {
  projectRoot: string;
  suggestions: RuntimeSuggestion[];
  generatedAt: string;
}
