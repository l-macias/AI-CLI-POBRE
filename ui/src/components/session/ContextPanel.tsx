import { FileSearch } from 'lucide-react';
import type { InteractiveSessionState } from '../../types/runtime';
import { Badge } from '../Badge';
import { ContextViewer } from '../context/ContextViewer';

interface ContextPanelProps {
  session: InteractiveSessionState | null;
  readOnly?: boolean;
}

export function ContextPanel({ session, readOnly = false }: ContextPanelProps) {
  return (
    <section
      id="context-session-panel"
      className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm scroll-mt-32"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-6">
        <div className="flex items-start gap-3">
          <FileSearch size={20} className="text-indigo-400 mt-0.5 shrink-0" />

          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
              Basic session context
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              {readOnly
                ? 'Read-only context used for analysis and recommendations. No patch proposal is required.'
                : 'Runtime context used to understand scope before planning, patching or verification.'}
            </p>
          </div>
        </div>

        <Badge tone={session ? 'green' : 'slate'}>{session ? 'session context' : 'empty'}</Badge>
      </div>

      <ContextViewer session={session} readOnly={readOnly} />
    </section>
  );
}
