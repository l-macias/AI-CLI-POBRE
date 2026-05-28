import type { InteractiveSessionState } from '../../types/runtime';
import { ContextViewer } from '../context/ContextViewer';

interface ContextPanelProps {
  session: InteractiveSessionState | null;
}

export function ContextPanel({ session }: ContextPanelProps) {
  return (
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <ContextViewer session={session} />
    </section>
  );
}
