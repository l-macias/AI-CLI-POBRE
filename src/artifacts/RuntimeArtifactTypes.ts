import type { JsonObject } from '../types/SharedTypes.js';

export type RuntimeArtifactKind =
  | 'runtime_plan'
  | 'patch_proposal'
  | 'patch_diff'
  | 'apply_report'
  | 'session_state'
  | 'task_state'
  | 'verify_runs'
  | 'session_decisions'
  | 'report_markdown'
  | 'report_json'
  | 'active_plan'
  | 'active_patch_proposal'
  | 'active_patch_diff'
  | 'unknown';

export interface RuntimeArtifactSummary {
  id: string;
  kind: RuntimeArtifactKind;
  label: string;
  path: string;
  sessionId?: string | undefined;
  projectRoot?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  sizeBytes: number;
  metadata: JsonObject;
}

export interface RuntimeArtifactIndex {
  version: 1;
  rootDir: string;
  artifacts: RuntimeArtifactSummary[];
  generatedAt: string;
}

export interface RuntimeArtifactStoreOptions {
  rootDir?: string | undefined;
}

export interface RuntimeArtifactReadResult {
  artifact: RuntimeArtifactSummary;
  content: string;
}
