import { Badge } from '../Badge';
import type { SessionDecision } from './MemoryTypes';

interface SessionDecisionCardProps {
  decision: SessionDecision;
}

export function SessionDecisionCard({ decision }: SessionDecisionCardProps) {
  return (
    <article className="flex flex-col gap-3 p-4 rounded-xl border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700/80 transition-colors shadow-sm">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <strong className="text-sm font-medium text-zinc-200 leading-relaxed">
          {decision.statement}
        </strong>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Badge tone="blue">{decision.category}</Badge>
          <Badge tone={toneForStrength(decision.strength)}>{decision.strength}</Badge>
          <Badge tone="slate">{decision.source}</Badge>
        </div>
      </div>

      <p className="text-xs text-zinc-500 bg-zinc-900/50 p-2 rounded border border-zinc-800/40 break-words">
        <span className="font-semibold text-zinc-400 uppercase tracking-wider mr-2 text-[10px]">
          Normalized:
        </span>
        {decision.normalizedStatement}
      </p>

      <div className="mt-1 flex justify-end">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          {new Date(decision.createdAt).toLocaleString()}
        </span>
      </div>
    </article>
  );
}

function toneForStrength(strength: SessionDecision['strength']) {
  if (strength === 'hard_rule') {
    return 'red';
  }

  if (strength === 'constraint') {
    return 'yellow';
  }

  return 'green';
}
