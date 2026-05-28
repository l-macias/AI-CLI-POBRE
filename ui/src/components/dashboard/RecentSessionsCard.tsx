import { Clock, TerminalSquare } from 'lucide-react';
import { Badge } from '../Badge';
import type { InteractiveSessionState } from '../../types/runtime';

interface RecentSessionsCardProps {
  sessions: InteractiveSessionState[];
  activeSession: InteractiveSessionState | null;
  onOpenSession: () => void;
}

export function RecentSessionsCard({
  sessions,
  activeSession,
  onOpenSession,
}: RecentSessionsCardProps) {
  return (
    <article className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-zinc-100">
          <TerminalSquare size={18} className="text-indigo-400" />
          <strong className="font-medium text-base">Recent active sessions</strong>
        </div>

        <Badge tone={sessions.length > 0 ? 'green' : 'slate'}>{sessions.length} active</Badge>
      </div>

      <div className="flex flex-col gap-2 flex-1 mb-5">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg bg-zinc-950/50 border border-dashed border-zinc-800 h-full">
            <p className="text-xs text-zinc-500 leading-relaxed">
              No active sessions. Start a new session or restore one from Settings &gt; Runtime
              data.
            </p>
          </div>
        ) : (
          sessions.slice(0, 5).map((session) => {
            const isActive = activeSession?.id === session.id;
            return (
              <button
                key={session.id}
                className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/30'
                    : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'
                }`}
                onClick={onOpenSession}
              >
                <strong
                  className={`text-sm truncate w-full ${isActive ? 'text-indigo-300' : 'text-zinc-200'}`}
                >
                  {session.projectName}
                </strong>
                <span className="text-xs text-zinc-400 mt-1 truncate w-full">
                  {session.goal.current}
                </span>
                <small className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-2 uppercase tracking-wider">
                  <Clock size={12} />
                  {new Date(session.updatedAt).toLocaleString()}
                </small>
              </button>
            );
          })
        )}
      </div>

      <button
        className="mt-auto w-full rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
        onClick={onOpenSession}
      >
        Open Session
      </button>
    </article>
  );
}
