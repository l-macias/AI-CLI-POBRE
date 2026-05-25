import type { PatchApplyResult } from '../patch-apply/PatchApplyTypes.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';
import type { VerifyRunResult } from '../verify/VerifyRunner.js';

export type PatchSandboxStatus = 'passed' | 'failed' | 'blocked';

export interface SandboxWorkspace {
  sandboxId: string;
  sessionId: string;
  sourceProjectRoot: string;
  sandboxRoot: string;
  workspaceRoot: string;
  createdAt: string;
}

export interface PatchSandboxIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface PatchSandboxVerifyCommand {
  command: 'npm' | 'tsc';
  args: string[];
  reason: string;
  requiresApproval: true;
}

export interface PatchSandboxInput {
  proposal: RuntimePatchProposal;
  verifyCommands: PatchSandboxVerifyCommand[];
  approvalState: 'approved';
}

export interface PatchSandboxResult {
  id: string;
  status: PatchSandboxStatus;
  proposalId: string;
  sessionId: string;
  projectRoot: string;
  workspace: SandboxWorkspace | null;
  applyResult: PatchApplyResult | null;
  verifyRuns: VerifyRunResult[];
  issues: PatchSandboxIssue[];
  startedAt: string;
  completedAt: string;
}
