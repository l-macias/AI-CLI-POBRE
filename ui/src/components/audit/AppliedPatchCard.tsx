import { GitCompare } from 'lucide-react';
import { Badge } from '../Badge';
import type { AuditTimelineEvent } from './AuditTypes';

interface AppliedPatchCardProps {
  event: AuditTimelineEvent;
}

export function AppliedPatchCard({ event }: AppliedPatchCardProps) {
  return (
    <article className="audit-special-card audit-applied-card">
      <div className="audit-special-icon">
        <GitCompare size={18} />
      </div>

      <div>
        <div className="audit-event-header">
          <strong>{event.title}</strong>
          <Badge tone="green">applied</Badge>
        </div>

        <p>{event.description}</p>
        <time>{new Date(event.createdAt).toLocaleTimeString()}</time>
      </div>
    </article>
  );
}
