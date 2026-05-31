import { RefreshCcw, RotateCcw } from 'lucide-react';
import { Badge } from '../Badge';
import { SessionResumeCard } from './SessionResumeCard';
import type { InteractiveSessionState } from '../../types/runtime';

interface SessionResumePanelProps {
  sessions: InteractiveSessionState[];
  currentSession: InteractiveSessionState | null;
  loading?: boolean;
  onRefresh: () => void;
  onResume: (session: InteractiveSessionState) => void;
}

export function SessionResumePanel({
  sessions,
  currentSession,
  loading = false,
  onRefresh,
  onResume,
}: SessionResumePanelProps) {
  const sortedSessions = sessions.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-5">
        <div className="flex items-start gap-3">
          <RotateCcw size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
              Resume active session
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl">
              Restore a non-archived runtime session, then inspect preserved evidence from the
              Artifact Store.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge tone={sortedSessions.length > 0 ? 'green' : 'slate'}>
            {sortedSessions.length} active
          </Badge>

          <button
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
            disabled={loading}
            onClick={onRefresh}
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto max-h-150 pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {sortedSessions.length === 0 ? (
          <article className="flex flex-col items-center justify-center p-10 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50">
            <strong className="text-sm font-medium text-zinc-300">No active sessions found.</strong>
            <p className="text-xs text-zinc-500 mt-2 max-w-sm">
              Start a new session or restore an archived one from Settings &gt; Runtime data.
            </p>
          </article>
        ) : (
          sortedSessions.map((savedSession) => (
            <SessionResumeCard
              key={savedSession.id}
              session={savedSession}
              selected={currentSession?.id === savedSession.id}
              onResume={onResume}
            />
          ))
        )}
      </div>
    </section>
  );
}
