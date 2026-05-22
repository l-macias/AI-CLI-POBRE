import type {
  InteractiveSessionState,
  RuntimePatchProposalGenerateResult,
  RuntimePlanGenerateResult,
} from '../../types/runtime';
import { PatchProposalViewer } from '../patch/PatchProposalViewer';

interface PatchPanelProps {
  session: InteractiveSessionState | null;
  runtimePlan: RuntimePlanGenerateResult | null;
  patchProposal: RuntimePatchProposalGenerateResult | null;
  loading: boolean;
  onGeneratePatchProposal: () => void;
  onCommand: (command: string) => void;
}

export function PatchPanel({
  session,
  runtimePlan,
  patchProposal,
  loading,
  onGeneratePatchProposal,
  onCommand,
}: PatchPanelProps) {
  return (
    <section className="panel session-patch-panel">
      <PatchProposalViewer
        session={session}
        runtimePlan={runtimePlan}
        patchProposal={patchProposal}
        loading={loading}
        onGeneratePatchProposal={onGeneratePatchProposal}
        onCommand={onCommand}
      />
    </section>
  );
}
