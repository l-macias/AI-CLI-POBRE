import { Badge } from '../Badge';
import type {
  RuntimePatchApplyResult,
  RuntimePatchDiffGenerateResult,
  RuntimePatchProposalGenerateResult,
  RuntimePatchRollbackResult,
  RuntimePlanGenerateResult,
} from '../../types/runtime';

interface WorkflowHealthBadgesProps {
  runtimePlan: RuntimePlanGenerateResult | null;
  patchProposal: RuntimePatchProposalGenerateResult | null;
  patchDiff: RuntimePatchDiffGenerateResult | null;
  applyResult: RuntimePatchApplyResult | null;
  rollbackResult: RuntimePatchRollbackResult | null;
}

export function WorkflowHealthBadges({
  runtimePlan,
  patchProposal,
  patchDiff,
  applyResult,
  rollbackResult,
}: WorkflowHealthBadgesProps) {
  return (
    <div className="workflow-health-badges">
      <Badge tone={runtimePlanTone(runtimePlan)}>plan: {runtimePlanLabel(runtimePlan)}</Badge>
      <Badge tone={patchProposalTone(patchProposal)}>
        patch: {patchProposalLabel(patchProposal)}
      </Badge>
      <Badge tone={patchDiffTone(patchDiff)}>diff: {patchDiffLabel(patchDiff)}</Badge>
      <Badge tone={applyTone(applyResult)}>apply: {applyLabel(applyResult)}</Badge>
      <Badge tone={rollbackTone(rollbackResult)}>rollback: {rollbackLabel(rollbackResult)}</Badge>
    </div>
  );
}

function runtimePlanLabel(plan: RuntimePlanGenerateResult | null): string {
  if (!plan) {
    return 'missing';
  }

  return plan.validation.valid ? 'valid' : 'blocked';
}

function runtimePlanTone(
  plan: RuntimePlanGenerateResult | null,
): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
  if (!plan) {
    return 'slate';
  }

  return plan.validation.valid ? 'green' : 'red';
}

function patchProposalLabel(proposal: RuntimePatchProposalGenerateResult | null): string {
  if (!proposal) {
    return 'missing';
  }

  return proposal.validation.valid ? 'valid' : 'blocked';
}

function patchProposalTone(
  proposal: RuntimePatchProposalGenerateResult | null,
): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
  if (!proposal) {
    return 'slate';
  }

  return proposal.validation.valid ? 'green' : 'red';
}

function patchDiffLabel(diff: RuntimePatchDiffGenerateResult | null): string {
  if (!diff) {
    return 'missing';
  }

  return diff.diff.safeToPreview ? 'ready' : 'blocked';
}

function patchDiffTone(
  diff: RuntimePatchDiffGenerateResult | null,
): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
  if (!diff) {
    return 'slate';
  }

  return diff.diff.safeToPreview ? 'green' : 'red';
}

function applyLabel(apply: RuntimePatchApplyResult | null): string {
  return apply?.status ?? 'none';
}

function applyTone(
  apply: RuntimePatchApplyResult | null,
): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
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
  return rollback?.status ?? 'none';
}

function rollbackTone(
  rollback: RuntimePatchRollbackResult | null,
): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
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
