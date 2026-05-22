import type { RuntimeEvent } from '../types/runtime';
import { Badge } from './Badge';

interface EventTimelineProps {
  events: RuntimeEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Live timeline</h2>
        <Badge tone="blue">{events.length} events</Badge>
      </div>

      <div className="timeline">
        {events.length === 0 ? (
          <p className="muted">No runtime events yet.</p>
        ) : (
          events.map((event) => (
            <article className="timeline-item" key={event.id}>
              <div>
                <strong>{event.name}</strong>
                <p>{event.message}</p>
              </div>
              <time>{new Date(event.createdAt).toLocaleTimeString()}</time>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
