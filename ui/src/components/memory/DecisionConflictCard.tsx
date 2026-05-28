import { AlertTriangle } from 'lucide-react';
import { Badge } from '../Badge';
import type { DecisionConflict } from './MemoryTypes';

interface DecisionConflictCardProps {
  conflict: DecisionConflict;
}

export function DecisionConflictCard({ conflict }: DecisionConflictCardProps) {
  const isError = conflict.severity === 'error';

  return (
    <article
      className={`flex items-start gap-4 p-4 rounded-xl border transition-colors shadow-sm ${
        isError ? 'border-red-500/20 bg-red-500/5' : 'border-yellow-500/20 bg-yellow-500/5'
      }`}
    >
      <div className={`mt-0.5 shrink-0 ${isError ? 'text-red-400' : 'text-yellow-400'}`}>
        <AlertTriangle size={18} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <strong
            className={`text-sm font-semibold ${isError ? 'text-red-200' : 'text-yellow-200'}`}
          >
            {conflict.reason}
          </strong>
          <Badge tone={isError ? 'red' : 'yellow'} className="shrink-0">
            {conflict.severity}
          </Badge>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <p className="p-2 rounded-md bg-zinc-950/50 border border-zinc-800/40 text-zinc-300">
            <strong className="text-zinc-500 mr-2">A:</strong>
            {conflict.decisionA.statement}
          </p>
          <p className="p-2 rounded-md bg-zinc-950/50 border border-zinc-800/40 text-zinc-300">
            <strong className="text-zinc-500 mr-2">B:</strong>
            {conflict.decisionB.statement}
          </p>
        </div>
      </div>
    </article>
  );
}
