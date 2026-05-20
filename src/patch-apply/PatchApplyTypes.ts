import type { PatchOperation, PatchProposal } from '../types/RepairTypes.js';
import type { GitChangeBoundary, GitWorkingTreeGuardResult } from '../git/GitAwarenessTypes.js';

export type PatchApplyStatus = 'applied' | 'blocked' | 'failed' | 'dry_run';

export interface PatchApplyIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface PatchApplyInput {
  projectRoot: string;
  proposal: PatchProposal;
  applyConfirmed: boolean;
  dryRun?: boolean | undefined;
  allowDirtyWorkingTree?: boolean | undefined;
  allowMissingRepository?: boolean | undefined;
  confirmDelete?: boolean | undefined;
  backupEnabled?: boolean | undefined;
}

export interface PatchApplyPlan {
  id: string;
  projectRoot: string;
  proposal: PatchProposal;
  operations: PatchOperation[];
  backupEnabled: boolean;
  createdAt: string;
  issues: PatchApplyIssue[];
}

export interface PatchBackupEntry {
  targetFile: string;
  backupPath: string;
  existed: boolean;
  createdAt: string;
}

export interface PatchApplyOperationResult {
  targetFile: string;
  kind: PatchOperation['kind'];
  status: 'applied' | 'skipped' | 'failed';
  backup?: PatchBackupEntry | undefined;
  message: string;
}

export interface PatchApplyResult {
  id: string;
  status: PatchApplyStatus;
  projectRoot: string;
  proposalId: string;

  gitBoundary: {
    boundary: GitChangeBoundary;
    guard: GitWorkingTreeGuardResult;
    safeToWrite: boolean;
  };
  plan: PatchApplyPlan;
  contentChecks: PatchApplyContentCheckResult[];
  operationResults: PatchApplyOperationResult[];
  issues: PatchApplyIssue[];
  createdAt: string;
  completedAt: string;
}
export interface PatchApplyContentCheckResult {
  targetFile: string;
  expectedContentProvided: boolean;
  matched: boolean;
  message: string;
}
