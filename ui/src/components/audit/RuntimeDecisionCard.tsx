import { ShieldCheck } from 'lucide-react';
import { Badge } from '../Badge';
import type { AuditTimelineEvent } from './AuditTypes';

interface RuntimeDecisionCardProps {
  event: AuditTimelineEvent;
}

export function RuntimeDecisionCard({ event }: RuntimeDecisionCardProps) {
  return (
    <article className="flex items-start gap-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 transition-colors shadow-sm">
      <div className="mt-0.5 flex-shrink-0 text-blue-400">
        <ShieldCheck size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <strong className="text-sm font-semibold text-blue-100">{event.title}</strong>
          <Badge tone="blue">runtime decision</Badge>
        </div>

        <p className="text-sm text-blue-200/70 leading-relaxed">{event.description}</p>
        <time className="block mt-2 text-xs text-blue-500/70 font-mono">
          {new Date(event.createdAt).toLocaleTimeString()}
        </time>
      </div>
    </article>
  );
}
