import { Check, Eye, MessageSquarePlus, RotateCcw, X } from 'lucide-react';

interface PlanActionsProps {
  disabled: boolean;
  onApprovePlan: () => void;
  onRequestChanges: () => void;
  onAddRestriction: () => void;
  onViewContext: () => void;
  onCancel: () => void;
}

export function PlanActions({
  disabled,
  onApprovePlan,
  onRequestChanges,
  onAddRestriction,
  onViewContext,
  onCancel,
}: PlanActionsProps) {
  return (
    <div className="plan-actions">
      <button disabled={disabled} onClick={onApprovePlan}>
        <Check size={16} />
        Approve plan
      </button>

      <button disabled={disabled} className="secondary-button" onClick={onRequestChanges}>
        <RotateCcw size={16} />
        Request changes
      </button>

      <button disabled={disabled} className="secondary-button" onClick={onAddRestriction}>
        <MessageSquarePlus size={16} />
        Add restriction
      </button>

      <button disabled={disabled} className="secondary-button" onClick={onViewContext}>
        <Eye size={16} />
        View context
      </button>

      <button disabled={disabled} className="danger-button" onClick={onCancel}>
        <X size={16} />
        Cancel
      </button>
    </div>
  );
}
