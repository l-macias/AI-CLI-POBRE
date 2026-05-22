import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSearch,
  GitCompare,
  Info,
  ListChecks,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '../Badge';
import type { AuditTimelineEvent } from './AuditTypes';

interface AuditEventCardProps {
  event: AuditTimelineEvent;
}

export function AuditEventCard({ event }: AuditEventCardProps) {
  return (
    <article className={`audit-event-card audit-event-${event.status}`}>
      <div className="audit-event-icon">
        <AuditIcon kind={event.kind} status={event.status} />
      </div>

      <div className="audit-event-content">
        <div className="audit-event-header">
          <strong>{event.title}</strong>

          <div className="audit-event-badges">
            <Badge tone={toneForRisk(event.riskLevel)}>{event.riskLevel}</Badge>
            <Badge tone={toneForStatus(event.status)}>{event.status}</Badge>
          </div>
        </div>

        <p>{event.description}</p>

        <footer>
          <span>{event.kind}</span>
          <time>{new Date(event.createdAt).toLocaleTimeString()}</time>
        </footer>
      </div>
    </article>
  );
}

function AuditIcon({
  kind,
  status,
}: {
  kind: AuditTimelineEvent['kind'];
  status: AuditTimelineEvent['status'];
}) {
  if (status === 'blocked') {
    return <AlertTriangle size={18} />;
  }

  if (status === 'approved' || status === 'completed') {
    return <CheckCircle2 size={18} />;
  }

  if (status === 'pending') {
    return <Clock size={18} />;
  }

  if (kind === 'user_request') {
    return <MessageSquare size={18} />;
  }

  if (kind === 'context_read') {
    return <FileSearch size={18} />;
  }

  if (kind === 'plan_proposed') {
    return <ListChecks size={18} />;
  }

  if (kind === 'patch_proposed' || kind === 'patch_applied') {
    return <GitCompare size={18} />;
  }

  if (kind === 'approval' || kind === 'runtime_decision') {
    return <ShieldCheck size={18} />;
  }

  return <Info size={18} />;
}

function toneForRisk(risk: AuditTimelineEvent['riskLevel']): 'green' | 'yellow' | 'red' {
  if (risk === 'high') {
    return 'red';
  }

  if (risk === 'medium') {
    return 'yellow';
  }

  return 'green';
}

function toneForStatus(
  status: AuditTimelineEvent['status'],
): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
  if (status === 'completed' || status === 'approved') {
    return 'green';
  }

  if (status === 'blocked') {
    return 'red';
  }

  if (status === 'pending') {
    return 'yellow';
  }

  return 'slate';
}
