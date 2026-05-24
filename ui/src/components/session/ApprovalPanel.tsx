import type { ApprovalCenterResult } from '../../types/runtime';
import { ApprovalPanel as ApprovalGatePanel } from '../approval/ApprovalPanel';
import type { ApprovalDecisionViewInput } from '../approval/ApprovalTypes';

interface ApprovalPanelProps {
  center: ApprovalCenterResult | null;
  loading?: boolean;
  onDecision: (input: ApprovalDecisionViewInput) => void;
}

export function ApprovalPanel({ center, loading = false, onDecision }: ApprovalPanelProps) {
  return (
    <section className="panel session-approval-panel">
      <ApprovalGatePanel center={center} loading={loading} onDecision={onDecision} />
    </section>
  );
}
