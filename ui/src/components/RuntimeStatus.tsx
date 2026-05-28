import { Activity } from 'lucide-react';
import type { RuntimeHealth } from '../types/runtime';
import { Badge } from './Badge';

interface RuntimeStatusProps {
  health: RuntimeHealth | null;
  compact?: boolean;
}

export function RuntimeStatus({ health, compact = false }: RuntimeStatusProps) {
  const online = health?.status === 'ok';

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <span
          className={`flex items-center justify-center rounded-md p-1.5 ${online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
        >
          <Activity size={14} className={online ? 'animate-pulse' : ''} />
        </span>

        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
          <strong className="text-xs font-medium text-zinc-200">
            {online ? 'Online' : 'Offline'}
          </strong>
          <span className="text-[10px] text-zinc-500">{health?.service ?? 'zero-runtime-api'}</span>
        </div>

        <Badge tone={online ? 'green' : 'red'}>{online ? 'SSE ready' : 'check API'}</Badge>
      </div>
    );
  }

  return (
    <section className="flex items-start gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 shadow-sm backdrop-blur-sm">
      <div
        className={`flex items-center justify-center rounded-lg p-2.5 ${online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
      >
        <Activity size={20} className={online ? 'animate-pulse' : ''} />
      </div>

      <div className="flex-1">
        <strong className="block text-sm font-medium text-zinc-100">
          {online ? 'Runtime online' : 'Runtime unavailable'}
        </strong>
        <p className="mt-0.5 text-xs text-zinc-400">{health?.service ?? 'zero-runtime-api'}</p>
      </div>

      <Badge tone={online ? 'green' : 'red'}>{online ? 'SSE ready' : 'check API'}</Badge>
    </section>
  );
}
