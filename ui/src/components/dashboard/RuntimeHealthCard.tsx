import { Activity, ShieldCheck } from 'lucide-react';
import { Badge } from '../Badge';
import type { RuntimeHealth } from '../../types/runtime';

interface RuntimeHealthCardProps {
  health: RuntimeHealth | null;
}

export function RuntimeHealthCard({ health }: RuntimeHealthCardProps) {
  const isOk = health?.status === 'ok';

  return (
    <article className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-zinc-100">
          <Activity size={18} className={isOk ? 'text-emerald-400' : 'text-yellow-400'} />
          <strong className="font-medium text-base">Runtime health</strong>
        </div>

        <Badge tone={isOk ? 'green' : 'yellow'}>{health?.status ?? 'unknown'}</Badge>
      </div>

      <div className="flex flex-col gap-3 text-sm flex-1">
        <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
          <span className="text-zinc-500">Service</span>
          <span className="text-zinc-200 font-mono">{health?.service ?? 'not loaded'}</span>
        </div>
        <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
          <span className="text-zinc-500">Realtime</span>
          <span className="text-zinc-200">{health?.realtime ?? 'unknown'}</span>
        </div>
        <div className="flex justify-between items-center border-b border-zinc-800/60 pb-3">
          <span className="text-zinc-500">Local only</span>
          <span className="text-zinc-200">{health?.localOnly ? 'yes' : 'unknown'}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-lg bg-zinc-950/50 p-3 text-xs text-zinc-400 border border-zinc-800/40">
        <ShieldCheck size={16} className="text-zinc-500 shrink-0" />
        <span>Runtime authority preserved.</span>
      </div>
    </article>
  );
}
