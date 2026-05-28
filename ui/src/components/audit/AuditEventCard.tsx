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
  // Aplicamos un tinte sutil según el estado general del evento
  const bgClass =
    event.status === 'blocked'
      ? 'border-red-500/20 bg-red-500/5'
      : event.status === 'pending'
        ? 'border-yellow-500/20 bg-yellow-500/5'
        : 'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/80';

  const iconColor =
    event.status === 'blocked'
      ? 'text-red-400'
      : event.status === 'pending'
        ? 'text-yellow-400'
        : 'text-zinc-400';

  return (
    <article
      className={`flex items-start gap-4 p-4 rounded-xl border transition-colors shadow-sm ${bgClass}`}
    >
      <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
        <AuditIcon kind={event.kind} status={event.status} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <strong className="text-sm font-semibold text-zinc-100">{event.title}</strong>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={toneForRisk(event.riskLevel)}>{event.riskLevel}</Badge>
            <Badge tone={toneForStatus(event.status)}>{event.status}</Badge>
          </div>
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed">{event.description}</p>

        <footer className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/60 text-xs text-zinc-500">
          <span className="uppercase tracking-wider font-semibold">
            {event.kind.replace(/_/g, ' ')}
          </span>
          <time className="font-mono">{new Date(event.createdAt).toLocaleTimeString()}</time>
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
