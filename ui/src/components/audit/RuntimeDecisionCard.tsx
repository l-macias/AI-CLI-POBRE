import { ShieldCheck } from 'lucide-react';
import { Badge } from '../Badge';
import type { AuditTimelineEvent } from './AuditTypes';

interface RuntimeDecisionCardProps {
  event: AuditTimelineEvent;
}

export function RuntimeDecisionCard({ event }: RuntimeDecisionCardProps) {
  return (
    <article className="audit-special-card audit-decision-card">
      <div className="audit-special-icon">
        <ShieldCheck size={18} />
      </div>

      <div>
        <div className="audit-event-header">
          <strong>{event.title}</strong>
          <Badge tone="blue">runtime decision</Badge>
        </div>

        <p>{event.description}</p>
        <time>{new Date(event.createdAt).toLocaleTimeString()}</time>
      </div>
    </article>
  );
}
