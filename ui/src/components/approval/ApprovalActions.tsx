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
    <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-zinc-800/60">
      <button
        disabled={disabled || applyDisabled}
        onClick={onApproveAndApply}
        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Check size={16} />
        Approve and apply
      </button>

      <button
        disabled={disabled || applyDisabled}
        className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        onClick={onApplySingleFile}
      >
        <FileCheck2 size={16} />
        Apply selected file
      </button>

      <button
        disabled={disabled}
        className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        onClick={onReject}
      >
        <X size={16} />
        Reject
      </button>

      <button
        disabled={disabled}
        className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        onClick={onRequestRevision}
      >
        <RotateCcw size={16} />
        Request revision
      </button>

      <button
        disabled={disabled}
        className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        onClick={onSaveProposal}
      >
        <Save size={16} />
        Save proposal
      </button>
    </div>
  );
}
