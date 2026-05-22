import type { InteractiveSessionState } from '../../types/runtime';
import { PlanViewer } from '../plan/PlanViewer';

interface PlanPanelProps {
  session: InteractiveSessionState | null;
  onCommand: (command: string) => void;
}

export function PlanPanel({ session, onCommand }: PlanPanelProps) {
  return (
    <section className="panel session-plan-panel">
      <PlanViewer session={session} onCommand={onCommand} />
    </section>
  );
}
