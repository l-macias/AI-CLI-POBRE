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
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <ApprovalGatePanel center={center} loading={loading} onDecision={onDecision} />
    </section>
  );
}
