import { Ban } from 'lucide-react';
import { Badge } from '../Badge';
import type { AuditTimelineEvent } from './AuditTypes';

interface BlockedActionCardProps {
  event: AuditTimelineEvent;
}

export function BlockedActionCard({ event }: BlockedActionCardProps) {
  return (
    <article className="audit-special-card audit-blocked-card">
      <div className="audit-special-icon">
        <Ban size={18} />
      </div>

      <div>
        <div className="audit-event-header">
          <strong>{event.title}</strong>
          <Badge tone="red">blocked</Badge>
        </div>

        <p>{event.description}</p>
        <time>{new Date(event.createdAt).toLocaleTimeString()}</time>
      </div>
    </article>
  );
}
