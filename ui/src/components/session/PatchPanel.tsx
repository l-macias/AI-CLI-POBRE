import type {
  InteractiveSessionState,
  RuntimePatchApplyResult,
  RuntimePatchDiffGenerateResult,
  RuntimePatchProposalGenerateResult,
  RuntimePatchRollbackResult,
  RuntimePatchSandboxResult,
  RuntimePlanGenerateResult,
  SnapshotManifest,
  RuntimePatchRecoveryResult,
} from '../../types/runtime';
import { PatchProposalViewer } from '../patch/PatchProposalViewer';

interface PatchPanelProps {
  session: InteractiveSessionState | null;
  runtimePlan: RuntimePlanGenerateResult | null;
  patchProposal: RuntimePatchProposalGenerateResult | null;
  patchDiff: RuntimePatchDiffGenerateResult | null;
  sandboxResult: RuntimePatchSandboxResult | null;
  recoveryResult: RuntimePatchRecoveryResult | null;
  snapshot: { snapshot: SnapshotManifest } | null;
  applyResult: RuntimePatchApplyResult | null;
  rollbackResult: RuntimePatchRollbackResult | null;
  loading: boolean;
  diffLoading: boolean;
  sandboxLoading: boolean;
  recoveryLoading: boolean;
  applyLoading: boolean;
  rollbackLoading: boolean;
  onGeneratePatchProposal: () => void;
  onGeneratePatchDiff: () => void;
  onVerifySandbox: () => void;
  onPrepareRecovery: () => void;
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
  sandboxResult,
  snapshot,
  applyResult,
  rollbackResult,
  loading,
  diffLoading,
  sandboxLoading,
  applyLoading,
  rollbackLoading,
  recoveryResult,
  recoveryLoading,
  onPrepareRecovery,
  onGeneratePatchProposal,
  onGeneratePatchDiff,
  onVerifySandbox,
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
        sandboxResult={sandboxResult}
        recoveryResult={recoveryResult}
        snapshot={snapshot}
        applyResult={applyResult}
        rollbackResult={rollbackResult}
        loading={loading}
        diffLoading={diffLoading}
        sandboxLoading={sandboxLoading}
        recoveryLoading={recoveryLoading}
        applyLoading={applyLoading}
        rollbackLoading={rollbackLoading}
        onGeneratePatchProposal={onGeneratePatchProposal}
        onGeneratePatchDiff={onGeneratePatchDiff}
        onVerifySandbox={onVerifySandbox}
        onPrepareRecovery={onPrepareRecovery}
        onDryRunApply={onDryRunApply}
        onApplyPatch={onApplyPatch}
        onDryRunRollback={onDryRunRollback}
        onRollbackPatch={onRollbackPatch}
        onCommand={onCommand}
      />
    </section>
  );
}
