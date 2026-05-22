import type { InteractiveSessionState } from '../../types/runtime';
import { PatchDiffViewer } from '../diff/PatchDiffViewer';

interface PatchPanelProps {
  session: InteractiveSessionState | null;
  onCommand: (command: string) => void;
}

export function PatchPanel({ session, onCommand }: PatchPanelProps) {
  return (
    <section className="panel session-patch-panel">
      <PatchDiffViewer session={session} onCommand={onCommand} />
    </section>
  );
}
