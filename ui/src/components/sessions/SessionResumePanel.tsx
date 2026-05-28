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
            <h2>Resume active session</h2>
            <p className="muted">
              Continue a non-archived runtime session. Archived sessions can be restored from
              Settings &gt; Runtime data.
            </p>
          </div>
        </div>

        <div className="session-resume-actions">
          <Badge tone={sessions.length > 0 ? 'green' : 'slate'}>{sessions.length} active</Badge>

          <button className="secondary-button" disabled={loading} onClick={onRefresh}>
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="session-resume-list">
        {sessions.length === 0 ? (
          <article className="session-resume-empty">
            <strong>No active sessions found.</strong>
            <p>Start a new session or restore an archived one from Settings &gt; Runtime data.</p>
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
