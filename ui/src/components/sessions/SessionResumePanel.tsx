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
  return (
    <section className="panel session-resume-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <RotateCcw size={18} />
          <div>
            <h2>Resume Session</h2>
            <p className="muted">Restore a previous runtime session from local state.</p>
          </div>
        </div>

        <div className="session-resume-actions">
          <Badge tone={sessions.length > 0 ? 'green' : 'slate'}>{sessions.length} saved</Badge>

          <button className="secondary-button" disabled={loading} onClick={onRefresh}>
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="session-resume-list">
        {sessions.length === 0 ? (
          <article className="session-resume-empty">
            <strong>No saved sessions found.</strong>
            <p>Start a session first. It will be saved under .runtime/interactive-sessions.</p>
          </article>
        ) : (
          sessions.map((savedSession) => (
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
