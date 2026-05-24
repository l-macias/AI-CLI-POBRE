import type { InteractiveSessionState, RuntimePlanGenerateResult } from '../../types/runtime';
import { PlanViewer } from '../plan/PlanViewer';

interface PlanPanelProps {
  session: InteractiveSessionState | null;
  runtimePlan: RuntimePlanGenerateResult | null;
  loading: boolean;
  onGeneratePlan: () => void;
  onGenerateProviderPlan: () => void;
  onCommand: (command: string) => void;
}

export function PlanPanel({
  session,
  runtimePlan,
  loading,
  onGeneratePlan,
  onGenerateProviderPlan,
  onCommand,
}: PlanPanelProps) {
  return (
    <section id="runtime-plan-panel" className="panel session-plan-panel">
      <PlanViewer
        session={session}
        runtimePlan={runtimePlan}
        loading={loading}
        onGeneratePlan={onGeneratePlan}
        onGenerateProviderPlan={onGenerateProviderPlan}
        onCommand={onCommand}
      />
    </section>
  );
}
