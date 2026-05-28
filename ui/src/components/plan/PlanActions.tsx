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
    <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-zinc-800/60">
      <button
        disabled={disabled}
        onClick={onApprovePlan}
        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <Check size={16} />
        Approve plan
      </button>

      <button
        disabled={disabled}
        onClick={onRequestChanges}
        className="flex items-center gap-2 rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
      >
        <RotateCcw size={16} />
        Request changes
      </button>

      <button
        disabled={disabled}
        onClick={onAddRestriction}
        className="flex items-center gap-2 rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
      >
        <MessageSquarePlus size={16} />
        Add restriction
      </button>

      <button
        disabled={disabled}
        onClick={onViewContext}
        className="flex items-center gap-2 rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
      >
        <Eye size={16} />
        View context
      </button>

      <button
        disabled={disabled}
        onClick={onCancel}
        className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 ml-auto"
      >
        <X size={16} />
        Cancel
      </button>
    </div>
  );
}
