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
    <article className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-title-row">
          <TerminalSquare size={18} />
          <strong>Recent active sessions</strong>
        </div>

        <Badge tone={sessions.length > 0 ? 'green' : 'slate'}>{sessions.length} active</Badge>
      </div>

      <div className="dashboard-list">
        {sessions.length === 0 ? (
          <p className="muted">
            No active sessions. Start a new session or restore one from Settings &gt; Runtime data.
          </p>
        ) : (
          sessions.slice(0, 5).map((session) => (
            <button
              key={session.id}
              className={`dashboard-list-row ${activeSession?.id === session.id ? 'selected' : ''}`}
              onClick={onOpenSession}
            >
              <strong>{session.projectName}</strong>
              <span>{session.goal.current}</span>
              <small>
                <Clock size={13} />
                {new Date(session.updatedAt).toLocaleString()}
              </small>
            </button>
          ))
        )}
      </div>

      <button className="secondary-button" onClick={onOpenSession}>
        Open Session
      </button>
    </article>
  );
}
