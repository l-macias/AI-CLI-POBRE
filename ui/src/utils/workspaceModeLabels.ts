export type WorkspaceModeLike =
  | 'local_snapshot'
  | 'local_patchless'
  | 'git_diff'
  | 'git_branch_pr'
  | string;

export interface WorkspaceModeCopy {
  value: string;
  label: string;
  shortLabel: string;
  description: string;
}

const localSnapshotMode: WorkspaceModeCopy = {
  value: 'local_snapshot',
  label: 'Safe local mode',
  shortLabel: 'Safe local',
  description: 'Recommended. Allows controlled local changes with snapshot-based rollback.',
};

const localPatchlessMode: WorkspaceModeCopy = {
  value: 'local_patchless',
  label: 'Read-only analysis',
  shortLabel: 'Read-only',
  description: 'Analysis and recommendations only. No patches or file writes.',
};

const gitDiffMode: WorkspaceModeCopy = {
  value: 'git_diff',
  label: 'Git diff mode',
  shortLabel: 'Git diff',
  description: 'Uses Git diff as the review boundary. Requires a Git repository.',
};

const gitBranchPrMode: WorkspaceModeCopy = {
  value: 'git_branch_pr',
  label: 'Branch / PR mode',
  shortLabel: 'Branch / PR',
  description: 'Branch-oriented workflow for pull-request style review.',
};

const workspaceModeCopies: Record<string, WorkspaceModeCopy> = {
  local_snapshot: localSnapshotMode,
  local_patchless: localPatchlessMode,
  git_diff: gitDiffMode,
  git_branch_pr: gitBranchPrMode,
};

export const workspaceModeOptions: WorkspaceModeCopy[] = [
  localSnapshotMode,
  localPatchlessMode,
  gitDiffMode,
  gitBranchPrMode,
];

export function getWorkspaceModeCopy(
  mode: WorkspaceModeLike | null | undefined,
): WorkspaceModeCopy {
  if (!mode) {
    return {
      value: 'unknown',
      label: 'Workspace not selected',
      shortLabel: 'Unknown',
      description: 'No workspace mode has been selected yet.',
    };
  }

  const copy = workspaceModeCopies[mode];

  if (copy) {
    return copy;
  }

  return {
    value: mode,
    label: mode,
    shortLabel: mode,
    description: 'Custom or unknown workspace mode.',
  };
}

export function formatWorkspaceMode(mode: WorkspaceModeLike | null | undefined): string {
  return getWorkspaceModeCopy(mode).label;
}

export function formatWorkspaceModeShort(mode: WorkspaceModeLike | null | undefined): string {
  return getWorkspaceModeCopy(mode).shortLabel;
}
