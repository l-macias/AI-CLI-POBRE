import { AlertTriangle, CheckCircle2, GitBranch, ShieldCheck } from 'lucide-react';
import type {
  InteractiveSessionState,
  RuntimePatchApplyResult,
  RuntimePatchDiffGenerateResult,
  RuntimePatchProposalGenerateResult,
  RuntimePatchRecoveryResult,
  RuntimePatchRollbackResult,
  RuntimePatchSandboxResult,
  RuntimePlanGenerateResult,
  SnapshotManifest,
} from '../../types/runtime';
import { Badge } from '../Badge';
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
  recoveryProposalLoading: boolean;
  onGenerateRecoveryProposal: () => void;
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

type PatchStageTone = 'blue' | 'green' | 'yellow' | 'red' | 'slate';

interface PatchStageView {
  title: string;
  description: string;
  tone: PatchStageTone;
  statusLabel: string;
  icon: 'branch' | 'shield' | 'warning' | 'check';
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
  recoveryProposalLoading,
  onGenerateRecoveryProposal,
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
  const stage = buildPatchStage({
    runtimePlan,
    patchProposal,
    patchDiff,
    sandboxResult,
    recoveryResult,
    applyResult,
    rollbackResult,
  });

  const reviewItems = buildReviewItems({
    runtimePlan,
    patchProposal,
    patchDiff,
    sandboxResult,
    snapshot,
    applyResult,
  });

  const safetyMessage = buildSafetyMessage({
    runtimePlan,
    patchProposal,
    patchDiff,
    sandboxResult,
    recoveryResult,
    applyResult,
  });

  return (
    <section id="runtime-patch-panel" className="panel session-patch-panel">
      <article className={`patch-review-hero patch-review-hero-${stage.tone}`}>
        <div className="patch-review-main">
          <div className="panel-title-row">
            <PatchStageIcon icon={stage.icon} />
            <div>
              <div className="workflow-kicker">
                <GitBranch size={16} />
                <span>Patch review center</span>
                <Badge tone={stage.tone}>{stage.statusLabel}</Badge>
              </div>

              <h2>{stage.title}</h2>
              <p className="muted">{stage.description}</p>
            </div>
          </div>

          <div className={`patch-safety-message patch-safety-message-${safetyMessage.tone}`}>
            {safetyMessage.tone === 'red' || safetyMessage.tone === 'yellow' ? (
              <AlertTriangle size={18} />
            ) : (
              <ShieldCheck size={18} />
            )}

            <div>
              <strong>{safetyMessage.title}</strong>
              <p>{safetyMessage.description}</p>
            </div>
          </div>
        </div>

        <div className="patch-review-checklist">
          {reviewItems.map((item) => (
            <PatchReviewItem
              key={item.label}
              label={item.label}
              description={item.description}
              status={item.status}
              tone={item.tone}
            />
          ))}
        </div>
      </article>

      <details className="patch-review-help">
        <summary>How to read this panel</summary>
        <div>
          <p>
            Start from the status above. Review the proposal and diff first, then run sandbox. Real
            apply stays locked until Zero has enough evidence and you explicitly confirm it.
          </p>
          <p>
            Recovery and rollback are advanced safety paths. Use them only when the runtime says
            they are available.
          </p>
        </div>
      </details>

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
        recoveryProposalLoading={recoveryProposalLoading}
        onGenerateRecoveryProposal={onGenerateRecoveryProposal}
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

function PatchStageIcon({ icon }: { icon: PatchStageView['icon'] }) {
  if (icon === 'check') {
    return <CheckCircle2 size={20} />;
  }

  if (icon === 'shield') {
    return <ShieldCheck size={20} />;
  }

  if (icon === 'warning') {
    return <AlertTriangle size={20} />;
  }

  return <GitBranch size={20} />;
}

function PatchReviewItem({
  label,
  description,
  status,
  tone,
}: {
  label: string;
  description: string;
  status: string;
  tone: PatchStageTone;
}) {
  return (
    <div className={`patch-review-item patch-review-item-${tone}`}>
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>

      <Badge tone={tone}>{status}</Badge>
    </div>
  );
}

function buildPatchStage(input: {
  runtimePlan: RuntimePlanGenerateResult | null;
  patchProposal: RuntimePatchProposalGenerateResult | null;
  patchDiff: RuntimePatchDiffGenerateResult | null;
  sandboxResult: RuntimePatchSandboxResult | null;
  recoveryResult: RuntimePatchRecoveryResult | null;
  applyResult: RuntimePatchApplyResult | null;
  rollbackResult: RuntimePatchRollbackResult | null;
}): PatchStageView {
  if (!input.runtimePlan) {
    return {
      title: 'Create a plan before reviewing changes',
      description:
        'Zero needs a valid implementation plan before it can generate a patch proposal.',
      tone: 'slate',
      statusLabel: 'waiting',
      icon: 'branch',
    };
  }

  if (!input.runtimePlan.validation.valid) {
    return {
      title: 'Plan is blocked',
      description: 'The runtime rejected the plan. Fix the plan before creating a patch.',
      tone: 'red',
      statusLabel: 'blocked',
      icon: 'warning',
    };
  }

  if (!input.patchProposal) {
    return {
      title: 'Patch proposal is the next step',
      description:
        'Generate a reviewable patch proposal. This will not write files to your project.',
      tone: 'blue',
      statusLabel: 'ready',
      icon: 'branch',
    };
  }

  if (!input.patchProposal.validation.valid) {
    return {
      title: 'Patch proposal is blocked',
      description: 'The runtime rejected this proposal. Generate a safer patch before continuing.',
      tone: 'red',
      statusLabel: 'blocked',
      icon: 'warning',
    };
  }

  if (!input.patchDiff) {
    return {
      title: 'Preview the diff before testing',
      description: 'Generate a diff so you can see exactly what would change.',
      tone: 'blue',
      statusLabel: 'ready',
      icon: 'branch',
    };
  }

  if (!input.patchDiff.diff.safeToPreview) {
    return {
      title: 'Diff preview is blocked',
      description: 'Zero marked the diff as unsafe to preview. Review the proposal before testing.',
      tone: 'red',
      statusLabel: 'blocked',
      icon: 'warning',
    };
  }

  if (!input.sandboxResult) {
    return {
      title: 'Run sandbox verification',
      description:
        'The diff is ready. Test it in an isolated workspace before any real apply is allowed.',
      tone: 'yellow',
      statusLabel: 'needs sandbox',
      icon: 'shield',
    };
  }

  if (input.sandboxResult.status === 'failed' || input.sandboxResult.status === 'blocked') {
    if (input.recoveryResult?.status === 'repair_prompt_ready') {
      return {
        title: 'Recovery is ready',
        description:
          'Sandbox did not pass. Zero prepared recovery context so you can generate a repaired patch.',
        tone: 'yellow',
        statusLabel: 'recovery ready',
        icon: 'warning',
      };
    }

    return {
      title: 'Sandbox failed',
      description: 'Real apply is blocked. Prepare recovery before generating a repaired patch.',
      tone: 'red',
      statusLabel: 'failed',
      icon: 'warning',
    };
  }

  if (input.sandboxResult.status === 'passed' && !input.applyResult) {
    return {
      title: 'Sandbox passed',
      description:
        'The patch passed isolated verification. Run a dry-run before considering real apply.',
      tone: 'green',
      statusLabel: 'passed',
      icon: 'shield',
    };
  }

  if (input.applyResult?.status === 'dry_run') {
    return {
      title: 'Dry-run passed',
      description:
        'The apply path was checked without writing files. Real apply still requires explicit confirmation.',
      tone: 'green',
      statusLabel: 'dry-run',
      icon: 'shield',
    };
  }

  if (input.applyResult?.status === 'applied') {
    return {
      title: 'Patch applied',
      description:
        'The patch was applied through runtime gates. Rollback and report export are now available.',
      tone: 'green',
      statusLabel: 'applied',
      icon: 'check',
    };
  }

  if (input.applyResult?.status === 'blocked') {
    return {
      title: 'Apply was blocked',
      description: 'Runtime policy blocked the apply action. Review the reason before continuing.',
      tone: 'red',
      statusLabel: 'blocked',
      icon: 'warning',
    };
  }

  if (input.applyResult?.status === 'failed') {
    return {
      title: 'Apply failed',
      description: 'The apply attempt failed. Review runtime output before continuing.',
      tone: 'red',
      statusLabel: 'failed',
      icon: 'warning',
    };
  }

  if (input.rollbackResult?.status === 'rolled_back') {
    return {
      title: 'Rollback completed',
      description: 'Files were restored from runtime backups.',
      tone: 'green',
      statusLabel: 'rolled back',
      icon: 'check',
    };
  }

  return {
    title: 'Patch review in progress',
    description: 'Continue with the next safe action shown by Zero.',
    tone: 'blue',
    statusLabel: 'in progress',
    icon: 'branch',
  };
}

function buildReviewItems(input: {
  runtimePlan: RuntimePlanGenerateResult | null;
  patchProposal: RuntimePatchProposalGenerateResult | null;
  patchDiff: RuntimePatchDiffGenerateResult | null;
  sandboxResult: RuntimePatchSandboxResult | null;
  snapshot: { snapshot: SnapshotManifest } | null;
  applyResult: RuntimePatchApplyResult | null;
}): {
  label: string;
  description: string;
  status: string;
  tone: PatchStageTone;
}[] {
  return [
    {
      label: 'Plan',
      description: 'The controlled blueprint for the change.',
      status: input.runtimePlan?.validation.valid === true ? 'Valid' : 'Needed',
      tone: input.runtimePlan?.validation.valid === true ? 'green' : 'slate',
    },
    {
      label: 'Proposal',
      description: 'The patch Zero wants to review.',
      status: input.patchProposal?.validation.valid === true ? 'Ready' : 'Needed',
      tone: input.patchProposal?.validation.valid === true ? 'green' : 'slate',
    },
    {
      label: 'Diff',
      description: 'The exact file changes before testing or apply.',
      status: input.patchDiff?.diff.safeToPreview === true ? 'Safe preview' : 'Needed',
      tone: input.patchDiff?.diff.safeToPreview === true ? 'green' : 'slate',
    },
    {
      label: 'Sandbox',
      description: 'Isolated verification before real writes.',
      status: sandboxStatusLabel(input.sandboxResult),
      tone: sandboxTone(input.sandboxResult),
    },
    {
      label: 'Snapshot',
      description: 'Extra safety before risky real apply.',
      status: input.snapshot ? 'Available' : 'Optional/needed by risk',
      tone: input.snapshot ? 'green' : 'slate',
    },
    {
      label: 'Apply',
      description: 'Real write guarded by explicit confirmation.',
      status: applyStatusLabel(input.applyResult),
      tone: applyTone(input.applyResult),
    },
  ];
}

function buildSafetyMessage(input: {
  runtimePlan: RuntimePlanGenerateResult | null;
  patchProposal: RuntimePatchProposalGenerateResult | null;
  patchDiff: RuntimePatchDiffGenerateResult | null;
  sandboxResult: RuntimePatchSandboxResult | null;
  recoveryResult: RuntimePatchRecoveryResult | null;
  applyResult: RuntimePatchApplyResult | null;
}): {
  title: string;
  description: string;
  tone: PatchStageTone;
} {
  if (!input.runtimePlan || !input.runtimePlan.validation.valid) {
    return {
      title: 'Real apply is not available',
      description: 'A valid plan is required before Zero can propose or apply changes.',
      tone: 'slate',
    };
  }

  if (!input.patchProposal || !input.patchProposal.validation.valid) {
    return {
      title: 'No files can be changed yet',
      description: 'Generate a valid patch proposal first. This remains a review-only phase.',
      tone: 'blue',
    };
  }

  if (!input.patchDiff?.diff.safeToPreview) {
    return {
      title: 'Review is still incomplete',
      description: 'Generate a safe diff preview before sandbox verification.',
      tone: 'blue',
    };
  }

  if (!input.sandboxResult) {
    return {
      title: 'Apply is locked until sandbox runs',
      description: 'Run sandbox verification before dry-run or real apply.',
      tone: 'yellow',
    };
  }

  if (input.sandboxResult.status === 'failed' || input.sandboxResult.status === 'blocked') {
    return {
      title: input.recoveryResult ? 'Recovery path is available' : 'Apply is blocked',
      description: input.recoveryResult
        ? 'Use recovery to generate a repaired patch, then review a fresh diff and sandbox result.'
        : 'Prepare recovery before trying to continue. Real apply is intentionally blocked.',
      tone: input.recoveryResult ? 'yellow' : 'red',
    };
  }

  if (input.applyResult?.status === 'applied') {
    return {
      title: 'Change was applied through runtime gates',
      description: 'You can export a report or use rollback if needed.',
      tone: 'green',
    };
  }

  if (input.applyResult?.status === 'dry_run') {
    return {
      title: 'Dry-run passed, but real apply still needs confirmation',
      description: 'Type the required confirmation inside the patch viewer if you decide to apply.',
      tone: 'green',
    };
  }

  return {
    title: 'Sandbox passed',
    description: 'Run dry-run apply before considering a real write.',
    tone: 'green',
  };
}

function sandboxStatusLabel(sandbox: RuntimePatchSandboxResult | null): string {
  if (!sandbox) {
    return 'Not run';
  }

  if (sandbox.status === 'passed') {
    return 'Passed';
  }

  if (sandbox.status === 'failed') {
    return 'Failed';
  }

  if (sandbox.status === 'blocked') {
    return 'Blocked';
  }

  return sandbox.status;
}

function sandboxTone(sandbox: RuntimePatchSandboxResult | null): PatchStageTone {
  if (!sandbox) {
    return 'slate';
  }

  if (sandbox.status === 'passed') {
    return 'green';
  }

  if (sandbox.status === 'blocked') {
    return 'yellow';
  }

  return 'red';
}

function applyStatusLabel(apply: RuntimePatchApplyResult | null): string {
  if (!apply) {
    return 'Locked';
  }

  if (apply.status === 'dry_run') {
    return 'Dry-run passed';
  }

  if (apply.status === 'applied') {
    return 'Applied';
  }

  if (apply.status === 'blocked') {
    return 'Blocked';
  }

  if (apply.status === 'failed') {
    return 'Failed';
  }

  return apply.status;
}

function applyTone(apply: RuntimePatchApplyResult | null): PatchStageTone {
  if (!apply) {
    return 'slate';
  }

  if (apply.status === 'dry_run' || apply.status === 'applied') {
    return 'green';
  }

  if (apply.status === 'blocked') {
    return 'yellow';
  }

  return 'red';
}
