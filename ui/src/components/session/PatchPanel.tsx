import type {
  InteractiveSessionState,
  RuntimePatchApplyResult,
  RuntimePatchDiffGenerateResult,
  RuntimePatchProposalGenerateResult,
  RuntimePatchRollbackResult,
  RuntimePlanGenerateResult,
  SnapshotManifest,
} from '../../types/runtime';
import { PatchProposalViewer } from '../patch/PatchProposalViewer';

interface PatchPanelProps {
  session: InteractiveSessionState | null;
  runtimePlan: RuntimePlanGenerateResult | null;
  patchProposal: RuntimePatchProposalGenerateResult | null;
  patchDiff: RuntimePatchDiffGenerateResult | null;
  snapshot: { snapshot: SnapshotManifest } | null;
  applyResult: RuntimePatchApplyResult | null;
  rollbackResult: RuntimePatchRollbackResult | null;
  loading: boolean;
  diffLoading: boolean;
  applyLoading: boolean;
  rollbackLoading: boolean;
  onGeneratePatchProposal: () => void;
  onGeneratePatchDiff: () => void;
  onDryRunApply: () => void;
  onApplyPatch: (input: { confirmedText: string; allowDirtyWorkingTree: boolean }) => void;
  onDryRunRollback: () => void;
  onRollbackPatch: (input: { confirmedText: string }) => void;
  onCommand: (command: string) => void;
}

export function PatchPanel({
  session,
  runtimePlan,
  patchProposal,
  patchDiff,
  snapshot,
  applyResult,
  rollbackResult,
  loading,
  diffLoading,
  applyLoading,
  rollbackLoading,
  onGeneratePatchProposal,
  onGeneratePatchDiff,
  onDryRunApply,
  onApplyPatch,
  onDryRunRollback,
  onRollbackPatch,
  onCommand,
}: PatchPanelProps) {
  return (
    <section id="runtime-patch-panel" className="panel session-patch-panel">
      <PatchProposalViewer
        session={session}
        runtimePlan={runtimePlan}
        patchProposal={patchProposal}
        patchDiff={patchDiff}
        snapshot={snapshot}
        applyResult={applyResult}
        rollbackResult={rollbackResult}
        loading={loading}
        diffLoading={diffLoading}
        applyLoading={applyLoading}
        rollbackLoading={rollbackLoading}
        onGeneratePatchProposal={onGeneratePatchProposal}
        onGeneratePatchDiff={onGeneratePatchDiff}
        onDryRunApply={onDryRunApply}
        onApplyPatch={onApplyPatch}
        onDryRunRollback={onDryRunRollback}
        onRollbackPatch={onRollbackPatch}
        onCommand={onCommand}
      />
    </section>
  );
}
