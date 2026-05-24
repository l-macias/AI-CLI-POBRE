import type { InteractiveSessionState } from '../../types/runtime';
import { Badge } from '../Badge';

interface SessionTimelinePanelProps {
  session: InteractiveSessionState | null;
}

export function SessionTimelinePanel({ session }: SessionTimelinePanelProps) {
  const timeline = session?.timeline.slice().reverse() ?? [];

  return (
    <section className="panel session-side-panel">
      <div className="panel-header">
        <h2>Session timeline</h2>
        <Badge tone="blue">{session?.timeline.length ?? 0}</Badge>
      </div>

      <div className="mini-timeline">
        {timeline.length > 0 ? (
          timeline.map((event, index) => (
            <article
              className="mini-timeline-item"
              key={`${event.id}-${event.kind}-${event.createdAt}-${String(index)}`}
            >
              <strong>{event.kind}</strong>
              <p>{event.message}</p>
              <time>{new Date(event.createdAt).toLocaleTimeString()}</time>
            </article>
          ))
        ) : (
          <p className="muted">No timeline events yet.</p>
        )}
      </div>
    </section>
  );
}
