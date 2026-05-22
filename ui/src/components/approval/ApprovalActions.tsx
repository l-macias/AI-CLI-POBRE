import { Check, FileCheck2, RotateCcw, Save, X } from 'lucide-react';

interface ApprovalActionsProps {
  disabled: boolean;
  applyDisabled: boolean;
  onApproveAndApply: () => void;
  onApplySingleFile: () => void;
  onReject: () => void;
  onRequestRevision: () => void;
  onSaveProposal: () => void;
}

export function ApprovalActions({
  disabled,
  applyDisabled,
  onApproveAndApply,
  onApplySingleFile,
  onReject,
  onRequestRevision,
  onSaveProposal,
}: ApprovalActionsProps) {
  return (
    <div className="approval-actions-grid">
      <button disabled={disabled || applyDisabled} onClick={onApproveAndApply}>
        <Check size={16} />
        Approve and apply
      </button>

      <button
        disabled={disabled || applyDisabled}
        className="secondary-button"
        onClick={onApplySingleFile}
      >
        <FileCheck2 size={16} />
        Apply selected file
      </button>

      <button disabled={disabled} className="danger-button" onClick={onReject}>
        <X size={16} />
        Reject
      </button>

      <button disabled={disabled} className="secondary-button" onClick={onRequestRevision}>
        <RotateCcw size={16} />
        Request revision
      </button>

      <button disabled={disabled} className="secondary-button" onClick={onSaveProposal}>
        <Save size={16} />
        Save proposal
      </button>
    </div>
  );
}
