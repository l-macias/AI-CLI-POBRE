import type { ApprovalDecisionViewInput, ApprovalRequest } from './ApprovalTypes';
import { ApprovalRequestCard } from './ApprovalRequestCard';

interface RiskApprovalCardProps {
  request: ApprovalRequest;
  selectedFilePaths: string[];
  onToggleFile: (filePath: string) => void;
  onDecision: (input: ApprovalDecisionViewInput) => void;
}

export function RiskApprovalCard(props: RiskApprovalCardProps) {
  return <ApprovalRequestCard {...props} />;
}
