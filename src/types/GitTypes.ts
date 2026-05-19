export type GitFileStatusKind =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'untracked'
  | 'unknown';

export interface GitStatusFile {
  path: string;
  indexStatus: string;
  workingTreeStatus: string;
  kind: GitFileStatusKind;
}

export interface GitStatusResult {
  repositoryRoot: string;
  branch: string;
  clean: boolean;
  files: GitStatusFile[];
  checkedAt: string;
}

export interface GitDiffResult {
  repositoryRoot: string;
  target?: string | undefined;
  diff: string;
  changed: boolean;
  checkedAt: string;
}

export interface GitCheckpointResult {
  repositoryRoot: string;
  commitHash: string;
  message: string;
  filesIncluded: string[];
  createdAt: string;
}

export interface GitRestoreResult {
  repositoryRoot: string;
  restoredToRef: string;
  restoredFiles: string[];
  restoredAt: string;
}

export interface GitGuardIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface GitGuardResult {
  allowed: boolean;
  issues: GitGuardIssue[];
  checkedAt: string;
}

export interface PreChangeSnapshotResult {
  shouldCheckpoint: boolean;
  reason: string;
  status: GitStatusResult;
  checkedAt: string;
}
