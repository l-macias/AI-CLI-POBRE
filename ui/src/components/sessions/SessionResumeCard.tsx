import { Clock, FolderOpen } from 'lucide-react';
import { Badge } from '../Badge';
import type { InteractiveSessionState } from '../../types/runtime';

interface SessionResumeCardProps {
  session: InteractiveSessionState;
  selected: boolean;
  onResume: (session: InteractiveSessionState) => void;
}

export function SessionResumeCard({ session, selected, onResume }: SessionResumeCardProps) {
  return (
    <button
      className={`flex flex-col gap-4 p-5 rounded-xl border transition-all text-left w-full cursor-pointer group focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        selected
          ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20'
          : 'border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700/80 hover:bg-zinc-900/40'
      }`}
      onClick={() => onResume(session)}
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 w-full">
        <div className="flex-1 min-w-0">
          <strong
            className={`block text-sm font-semibold truncate ${selected ? 'text-indigo-300' : 'text-zinc-200'}`}
          >
            {session.projectName}
          </strong>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">
            {session.goal.current}
          </p>
        </div>

        <Badge tone={toneForStatus(session.status)} className="shrink-0 w-fit">
          {session.status}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 w-full mt-auto pt-4 border-t border-zinc-800/60">
        <span className="flex items-center gap-2 text-xs font-mono text-zinc-500 truncate w-full">
          <FolderOpen size={14} className="shrink-0" />
          <span className="truncate">{session.projectRoot}</span>
        </span>

        <span className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Clock size={14} className="shrink-0" />
          {new Date(session.updatedAt).toLocaleString()}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-1">
        <Badge tone="blue">{session.messages.length} messages</Badge>
        <Badge tone="blue">{session.runtimeActions.length} actions</Badge>
        <Badge tone="slate">{session.timeline.length} events</Badge>
      </div>
    </button>
  );
}

function toneForStatus(status: InteractiveSessionState['status']) {
  if (status === 'completed') {
    return 'green';
  }

  if (status === 'failed') {
    return 'red';
  }

  if (status === 'paused' || status === 'waiting_user_input' || status === 'waiting_approval') {
    return 'yellow';
  }

  return 'blue';
}
