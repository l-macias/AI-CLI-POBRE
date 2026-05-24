import type {
  ApprovalActionKind,
  ApprovalCenterResult,
  ApprovalChecklistItem,
  ApprovalRequest,
  ApprovalRiskLevel,
} from '../../types/runtime';

export type {
  ApprovalActionKind,
  ApprovalCenterResult,
  ApprovalChecklistItem,
  ApprovalRequest,
  ApprovalRiskLevel,
};

export interface ApprovalDecisionViewInput {
  requestId: string;
  action: ApprovalActionKind;
  selectedFilePaths?: string[];
  reason?: string;
}
