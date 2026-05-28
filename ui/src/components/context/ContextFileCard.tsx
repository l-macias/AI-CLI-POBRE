import { FileCode2, Lock, ShieldAlert } from 'lucide-react';
import { ContextReasonBadge } from './ContextReasonBadge';

export interface ContextFileItem {
  path: string;
  reason: string;
  status: 'selected' | 'related' | 'blocked' | 'protected';
  risk: 'low' | 'medium' | 'high';
}

interface ContextFileCardProps {
  file: ContextFileItem;
}

export function ContextFileCard({ file }: ContextFileCardProps) {
  const blocked = file.status === 'blocked' || file.status === 'protected';

  return (
    <article
      className={`flex items-start gap-4 p-4 rounded-xl border transition-colors shadow-sm ${
        blocked
          ? 'border-red-500/20 bg-red-500/5'
          : 'border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700/80'
      }`}
    >
      <div className={`mt-0.5 shrink-0 ${blocked ? 'text-red-400' : 'text-zinc-500'}`}>
        {blocked ? <Lock size={18} /> : <FileCode2 size={18} />}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2.5">
        <strong
          className={`text-sm font-mono truncate ${blocked ? 'text-red-200' : 'text-zinc-200'}`}
        >
          {file.path}
        </strong>

        <div className="flex flex-wrap items-center gap-2">
          <ContextReasonBadge reason={file.reason} />
          <ContextReasonBadge reason={file.status} />
          <ContextReasonBadge reason={`risk: ${file.risk}`} />
        </div>
      </div>

      {blocked ? <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={18} /> : null}
    </article>
  );
}
