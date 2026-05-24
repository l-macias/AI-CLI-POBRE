import type { ApprovalCenterResult } from '../../types/runtime';
import { ApprovalCenter } from './ApprovalCenter';
import type { ApprovalDecisionViewInput } from './ApprovalTypes';

interface ApprovalPanelProps {
  center: ApprovalCenterResult | null;
  loading?: boolean;
  onDecision: (input: ApprovalDecisionViewInput) => void;
}

export function ApprovalPanel({ center, loading = false, onDecision }: ApprovalPanelProps) {
  return <ApprovalCenter center={center} loading={loading} onDecision={onDecision} />;
}
