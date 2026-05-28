import { Badge } from '../Badge';
import type {
  RuntimePatchApplyResult,
  RuntimePatchDiffGenerateResult,
  RuntimePatchProposalGenerateResult,
  RuntimePatchRecoveryResult,
  RuntimePatchRollbackResult,
  RuntimePatchSandboxResult,
  RuntimePlanGenerateResult,
} from '../../types/runtime';

interface WorkflowHealthBadgesProps {
  runtimePlan: RuntimePlanGenerateResult | null;
  patchProposal: RuntimePatchProposalGenerateResult | null;
  patchDiff: RuntimePatchDiffGenerateResult | null;
  patchSandboxResult: RuntimePatchSandboxResult | null;
  patchRecoveryResult: RuntimePatchRecoveryResult | null;
  applyResult: RuntimePatchApplyResult | null;
  rollbackResult: RuntimePatchRollbackResult | null;
}

type BadgeTone = 'blue' | 'green' | 'yellow' | 'red' | 'slate';

export function WorkflowHealthBadges({
  runtimePlan,
  patchProposal,
  patchDiff,
  patchSandboxResult,
  patchRecoveryResult,
  applyResult,
  rollbackResult,
}: WorkflowHealthBadgesProps) {
  return (
    <div className="workflow-health-badges workflow-health-badges-friendly">
      <StatusPill
        label="Plan"
        tone={runtimePlanTone(runtimePlan)}
        value={runtimePlanLabel(runtimePlan)}
      />
      <StatusPill
        label="Patch"
        tone={patchProposalTone(patchProposal)}
        value={patchProposalLabel(patchProposal)}
      />
      <StatusPill label="Diff" tone={patchDiffTone(patchDiff)} value={patchDiffLabel(patchDiff)} />
      <StatusPill
        label="Sandbox"
        tone={sandboxTone(patchSandboxResult)}
        value={sandboxLabel(patchSandboxResult)}
      />
      <StatusPill
        label="Recovery"
        tone={recoveryTone(patchRecoveryResult)}
        value={recoveryLabel(patchRecoveryResult)}
      />
      <StatusPill label="Apply" tone={applyTone(applyResult)} value={applyLabel(applyResult)} />
      <StatusPill
        label="Rollback"
        tone={rollbackTone(rollbackResult)}
        value={rollbackLabel(rollbackResult)}
      />
    </div>
  );
}

function StatusPill({ label, value, tone }: { label: string; value: string; tone: BadgeTone }) {
  return (
    <div className="workflow-status-pill">
      <span>{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}

function runtimePlanLabel(plan: RuntimePlanGenerateResult | null): string {
  if (!plan) {
    return 'Not started';
  }

  return plan.validation.valid ? 'Valid' : 'Blocked';
}

function runtimePlanTone(plan: RuntimePlanGenerateResult | null): BadgeTone {
  if (!plan) {
    return 'slate';
  }

  return plan.validation.valid ? 'green' : 'red';
}

function patchProposalLabel(proposal: RuntimePatchProposalGenerateResult | null): string {
  if (!proposal) {
    return 'Not created';
  }

  return proposal.validation.valid ? 'Ready' : 'Blocked';
}

function patchProposalTone(proposal: RuntimePatchProposalGenerateResult | null): BadgeTone {
  if (!proposal) {
    return 'slate';
  }

  return proposal.validation.valid ? 'green' : 'red';
}

function patchDiffLabel(diff: RuntimePatchDiffGenerateResult | null): string {
  if (!diff) {
    return 'Not previewed';
  }

  return diff.diff.safeToPreview ? 'Safe preview' : 'Blocked';
}

function patchDiffTone(diff: RuntimePatchDiffGenerateResult | null): BadgeTone {
  if (!diff) {
    return 'slate';
  }

  return diff.diff.safeToPreview ? 'green' : 'red';
}

function sandboxLabel(sandbox: RuntimePatchSandboxResult | null): string {
  if (!sandbox) {
    return 'Not run';
  }

  if (sandbox.status === 'passed') {
    return 'Passed';
  }

  if (sandbox.status === 'blocked') {
    return 'Blocked';
  }

  if (sandbox.status === 'failed') {
    return 'Failed';
  }

  return sandbox.status;
}

function sandboxTone(sandbox: RuntimePatchSandboxResult | null): BadgeTone {
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

function recoveryLabel(recovery: RuntimePatchRecoveryResult | null): string {
  if (!recovery) {
    return 'Not needed';
  }

  if (recovery.status === 'repair_prompt_ready') {
    return `Ready — ${recovery.currentAttempt}/${recovery.maxAttempts}`;
  }

  if (recovery.status === 'max_attempts_reached') {
    return 'Max attempts';
  }

  return 'Not recoverable';
}

function recoveryTone(recovery: RuntimePatchRecoveryResult | null): BadgeTone {
  if (!recovery) {
    return 'slate';
  }

  if (recovery.status === 'repair_prompt_ready') {
    return 'yellow';
  }

  return 'red';
}

function applyLabel(apply: RuntimePatchApplyResult | null): string {
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

function applyTone(apply: RuntimePatchApplyResult | null): BadgeTone {
  if (!apply) {
    return 'slate';
  }

  if (apply.status === 'applied' || apply.status === 'dry_run') {
    return 'green';
  }

  if (apply.status === 'blocked') {
    return 'yellow';
  }

  return 'red';
}

function rollbackLabel(rollback: RuntimePatchRollbackResult | null): string {
  if (!rollback) {
    return 'Not needed';
  }

  if (rollback.status === 'dry_run') {
    return 'Dry-run passed';
  }

  if (rollback.status === 'rolled_back') {
    return 'Rolled back';
  }

  if (rollback.status === 'blocked') {
    return 'Blocked';
  }

  if (rollback.status === 'failed') {
    return 'Failed';
  }

  return rollback.status;
}

function rollbackTone(rollback: RuntimePatchRollbackResult | null): BadgeTone {
  if (!rollback) {
    return 'slate';
  }

  if (rollback.status === 'rolled_back' || rollback.status === 'dry_run') {
    return 'green';
  }

  if (rollback.status === 'blocked') {
    return 'yellow';
  }

  return 'red';
}
