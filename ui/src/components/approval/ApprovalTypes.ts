export type ApprovalRiskLevel = 'low' | 'medium' | 'high';

export interface ApprovalChecklistItem {
  id: string;
  label: string;
  description: string;
  status: 'passed' | 'warning' | 'blocked';
}

export interface ApprovalViewModel {
  id: string;
  title: string;
  riskLevel: ApprovalRiskLevel;
  workspaceMode: string;
  gitActive: boolean;
  snapshotAvailable: boolean;
  pendingActions: number;
  checklist: ApprovalChecklistItem[];
}
