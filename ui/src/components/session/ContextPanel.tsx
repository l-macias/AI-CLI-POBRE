import type { InteractiveSessionState } from '../../types/runtime';
import { ContextViewer } from '../context/ContextViewer';

interface ContextPanelProps {
  session: InteractiveSessionState | null;
}

export function ContextPanel({ session }: ContextPanelProps) {
  return (
    <section className="panel session-context-panel">
      <ContextViewer session={session} />
    </section>
  );
}
