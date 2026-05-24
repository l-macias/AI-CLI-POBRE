import type { ApprovalDecisionViewInput, ApprovalRequest } from './ApprovalTypes';
import { ApprovalRequestCard } from './ApprovalRequestCard';

interface PatchApprovalCardProps {
  request: ApprovalRequest;
  selectedFilePaths: string[];
  onToggleFile: (filePath: string) => void;
  onDecision: (input: ApprovalDecisionViewInput) => void;
}

export function PatchApprovalCard(props: PatchApprovalCardProps) {
  return <ApprovalRequestCard {...props} />;
}
