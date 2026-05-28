import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { Badge } from '../Badge';
import type { NextWorkflowAction } from './WorkflowTypes';

interface NextBestActionPanelProps {
  action: NextWorkflowAction;
}

export function NextBestActionPanel({ action }: NextBestActionPanelProps) {
  const isBlocked = Boolean(action.blockedReason);
  const isReady = !action.disabled && !isBlocked;

  return (
    <article
      className={`flex flex-col gap-5 p-6 rounded-xl border shadow-sm ${
        isBlocked ? 'border-red-500/30 bg-red-500/5' : 'border-indigo-500/30 bg-indigo-500/5'
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {isBlocked ? (
            <LockKeyhole size={16} className="text-red-400" />
          ) : (
            <Sparkles size={16} className="text-indigo-400" />
          )}
          <span
            className={`text-xs font-bold uppercase tracking-wider ${isBlocked ? 'text-red-400' : 'text-indigo-400'}`}
          >
            Next safe step
          </span>
          <Badge tone={isBlocked ? 'red' : isReady ? 'green' : 'slate'}>
            {isBlocked ? 'blocked' : isReady ? 'ready' : 'waiting'}
          </Badge>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-zinc-100">{action.title}</h3>
          <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{action.description}</p>
        </div>

        {action.blockedReason ? (
          <div className="flex items-center gap-2 text-xs text-red-300 bg-red-950/30 px-3 py-2 rounded-md border border-red-900/50">
            <Badge tone="red" className="text-[10px]">
              why blocked
            </Badge>
            <span>{action.blockedReason}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/30 px-3 py-2 rounded-md border border-emerald-900/50">
            <Badge tone="green" className="text-[10px]">
              safe to continue
            </Badge>
            <span>This is the recommended action for the current runtime state.</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={action.disabled}
          onClick={action.onRun}
        >
          {action.buttonLabel}
          {!action.disabled ? <ArrowRight size={18} /> : null}
        </button>

        {action.secondaryButtonLabel && action.onRunSecondary ? (
          <button
            className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
            disabled={action.disabled}
            onClick={action.onRunSecondary}
          >
            {action.secondaryButtonLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}
