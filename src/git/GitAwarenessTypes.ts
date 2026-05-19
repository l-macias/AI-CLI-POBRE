export type GitRepositoryState = 'present' | 'missing' | 'unknown';

export type GitWorkingTreeState = 'clean' | 'dirty' | 'unknown';

export type GitBoundaryDecision = 'allowed' | 'blocked' | 'warning';

export interface GitAwarenessIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface GitRepositoryDetectionResult {
  projectRoot: string;
  repositoryState: GitRepositoryState;
  repositoryRoot?: string | undefined;
  checkedAt: string;
  issues: GitAwarenessIssue[];
}

export interface GitStatusEntry {
  path: string;
  indexStatus: string;
  workingTreeStatus: string;
  kind: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'unknown';
}

export interface GitStatusSnapshot {
  projectRoot: string;
  repositoryRoot: string;
  branch: string;
  workingTreeState: GitWorkingTreeState;
  clean: boolean;
  files: GitStatusEntry[];
  checkedAt: string;
  issues: GitAwarenessIssue[];
}

export interface GitDiffSnapshot {
  projectRoot: string;
  repositoryRoot: string;
  target?: string | undefined;
  staged: boolean;
  changed: boolean;
  diff: string;
  truncated: boolean;
  checkedAt: string;
  issues: GitAwarenessIssue[];
}

export interface GitChangeBoundary {
  projectRoot: string;
  repositoryRoot: string;
  branch: string;
  workingTreeState: GitWorkingTreeState;
  clean: boolean;
  modifiedFiles: string[];
  untrackedFiles: string[];
  deletedFiles: string[];
  checkedAt: string;
  issues: GitAwarenessIssue[];
}

export interface GitWorkingTreeGuardResult {
  decision: GitBoundaryDecision;
  allowed: boolean;
  reason: string;
  issues: GitAwarenessIssue[];
  checkedAt: string;
}
