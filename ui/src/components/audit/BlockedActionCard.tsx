import { Ban } from 'lucide-react';
import { Badge } from '../Badge';
import type { AuditTimelineEvent } from './AuditTypes';

interface BlockedActionCardProps {
  event: AuditTimelineEvent;
}

export function BlockedActionCard({ event }: BlockedActionCardProps) {
  return (
    <article className="flex items-start gap-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5 transition-colors shadow-sm">
      <div className="mt-0.5 flex-shrink-0 text-red-400">
        <Ban size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <strong className="text-sm font-semibold text-red-100">{event.title}</strong>
          <Badge tone="red">blocked</Badge>
        </div>

        <p className="text-sm text-red-200/70 leading-relaxed">{event.description}</p>
        <time className="block mt-2 text-xs text-red-500/70 font-mono">
          {new Date(event.createdAt).toLocaleTimeString()}
        </time>
      </div>
    </article>
  );
}
