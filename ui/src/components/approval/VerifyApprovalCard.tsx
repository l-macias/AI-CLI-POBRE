import type { ApprovalDecisionViewInput, ApprovalRequest } from './ApprovalTypes';
import { ApprovalRequestCard } from './ApprovalRequestCard';

interface VerifyApprovalCardProps {
  request: ApprovalRequest;
  selectedFilePaths: string[];
  onToggleFile: (filePath: string) => void;
  onDecision: (input: ApprovalDecisionViewInput) => void;
}

export function VerifyApprovalCard(props: VerifyApprovalCardProps) {
  return <ApprovalRequestCard {...props} />;
}
