import type { PatchDiffPreview } from '../diff/PatchDiffTypes.js';
import type { PatchApplyResult } from '../patch-apply/PatchApplyTypes.js';
import type { PatchProposalOperation, RuntimePatchProposal } from '../patches/PatchProposal.js';
import type { RuntimePlan, RuntimePlanMode } from '../planning/RuntimePlan.js';
import type { VerifyRunResult } from '../verify/VerifyRunner.js';

export type ApprovalRiskLevel = 'low' | 'medium' | 'high';

export type ApprovalRequestKind =
  | 'plan'
  | 'patch'
  | 'verify'
  | 'risk'
  | 'dirty_working_tree'
  | 'rollback';

export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';

export type ApprovalActionKind = 'approve' | 'reject' | 'ask_revision' | 'approve_selected_files';

export interface ApprovalChecklistItem {
  id: string;
  label: string;
  description: string;
  status: 'passed' | 'warning' | 'blocked';
}

export interface ApprovalTarget {
  type: ApprovalRequestKind;
  id: string;
}

export interface ApprovalAction {
  kind: ApprovalActionKind;
  label: string;
  enabled: boolean;
  blockedReason?: string | undefined;
}

export interface ApprovalFileReview {
  path: string;
  operation: PatchProposalOperation;
  reason: string;
  changesSummary: string[];
  riskLevel: ApprovalRiskLevel;
  userSelectable: true;
  selectedByDefault: boolean;
}

export interface ApprovalRequest {
  id: string;
  sessionId: string;
  kind: ApprovalRequestKind;
  title: string;
  description: string;
  riskLevel: ApprovalRiskLevel;
  status: ApprovalRequestStatus;
  target: ApprovalTarget;
  checklist: ApprovalChecklistItem[];
  actions: ApprovalAction[];
  filePaths: string[];
  fileReviews: ApprovalFileReview[];
  createdAt: string;
}

export interface ApprovalCenterArtifactState {
  sessionId: string;
  projectRoot: string;
  plan?: RuntimePlan | null | undefined;
  planMode?: RuntimePlanMode | null | undefined;
  proposal?: RuntimePatchProposal | null | undefined;
  diff?: PatchDiffPreview | null | undefined;
  applyResult?: (PatchApplyResult & { sessionId?: string | undefined }) | null | undefined;
  lastVerifyRun?: VerifyRunResult | null | undefined;
  snapshotAvailable: boolean;
  dirtyWorkingTree: boolean;
}

export interface ApprovalCenterResult {
  sessionId: string;
  projectRoot: string;
  pendingCount: number;
  highestRisk: ApprovalRiskLevel;
  requests: ApprovalRequest[];
  generatedAt: string;
}

export interface ApprovalDecisionInput {
  requestId: string;
  action: ApprovalActionKind;
  selectedFilePaths?: string[] | undefined;
  reason?: string | undefined;
}

export interface ApprovalDecisionResult {
  requestId: string;
  action: ApprovalActionKind;
  accepted: boolean;
  blockedReason?: string | undefined;
  selectedFilePaths: string[];
  reason?: string | undefined;
  decidedAt: string;
}
