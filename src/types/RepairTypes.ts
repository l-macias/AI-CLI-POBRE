import type { GitChangeBoundary, GitWorkingTreeGuardResult } from '../git/GitAwarenessTypes.js';
import type { JsonObject } from './SharedTypes.js';
import type { RealProjectTrialErrorFinding } from './RealProjectTrialTypes.js';
import type { RepairModelPolicyDecision } from './RepairModelPolicyTypes.js';
export type RepairRiskLevel = 'low' | 'medium' | 'high';

export type RepairOperationKind = 'replace_file' | 'edit_file' | 'create_file' | 'delete_file';

export interface RepairTargetFile {
  relativePath: string;
  exists: boolean;
  content: string;
  bytes: number;
  relevantLineStart?: number | undefined;
  relevantLineEnd?: number | undefined;
}

export interface RepairRequest {
  id: string;
  objective: string;
  projectRoot: string;
  targetFiles: RepairTargetFile[];
  findings: RealProjectTrialErrorFinding[];
  constraints: RepairConstraint[];
  expectedOutput: RepairExpectedOutput;
  metadata?: JsonObject | undefined;
}

export interface RepairConstraint {
  code: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
}

export interface RepairExpectedOutput {
  format: 'json_patch_proposal';
  allowedOperations: RepairOperationKind[];
  requireExplanation: boolean;
  requireRiskAssessment: boolean;
}

export interface PatchProposal {
  id: string;
  summary: string;
  riskLevel: RepairRiskLevel;
  operations: PatchOperation[];
  explanation: string;
}

export interface PatchOperation {
  kind: RepairOperationKind;
  targetFile: string;
  newContent?: string | undefined;
  expectedCurrentContent?: string | undefined;
  reason: string;
}

export interface PatchValidationIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface PatchValidationResult {
  valid: boolean;
  issues: PatchValidationIssue[];
}

export type RepairAttemptStatus =
  | 'created'
  | 'context_built'
  | 'proposal_received'
  | 'proposal_invalid'
  | 'diff_ready'
  | 'failed';

export interface RepairModelUsage {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedUsd: number;
}

export interface RepairAttemptStep {
  id: string;
  status: 'executed' | 'blocked' | 'failed';
  description: string;
  timestamp: string;
}

export interface RepairDiffPreviewResult {
  targetFile: string;
  changed: boolean;
  changedLines: number;
  markdown: string;
}

export interface RepairAttemptGitBoundary {
  boundary: GitChangeBoundary;
  guard: GitWorkingTreeGuardResult;
  safeToWriteLater: boolean;
}

export interface RepairAttemptResult {
  id: string;
  status: RepairAttemptStatus;
  objective: string;
  projectRoot: string;
  request: RepairRequest;
  prompt: string;
  proposal?: PatchProposal | undefined;
  patchValidation: PatchValidationResult;
  diffPreviews: RepairDiffPreviewResult[];
  steps: RepairAttemptStep[];
  blockers: string[];
  failures: string[];
  modelUsage?: RepairModelUsage | undefined;
  modelPolicyDecision?: RepairModelPolicyDecision | undefined;
  providerFallbackUsed?: boolean | undefined;
  providerFallbackReason?: string | undefined;
  gitBoundary?: RepairAttemptGitBoundary | undefined;
  createdAt: string;
  completedAt: string;
}
