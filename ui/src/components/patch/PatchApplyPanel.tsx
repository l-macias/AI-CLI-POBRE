import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../Badge';
import type {
  RuntimePatchApplyResult,
  RuntimePatchDiffGenerateResult,
  RuntimePatchProposalGenerateResult,
  RuntimePatchSandboxResult,
  SnapshotManifest,
} from '../../types/runtime';

interface PatchApplyPanelProps {
  patchProposal: RuntimePatchProposalGenerateResult | null;
  patchDiff: RuntimePatchDiffGenerateResult | null;
  sandboxResult: RuntimePatchSandboxResult | null;
  snapshot: { snapshot: SnapshotManifest } | null;
  applyResult: RuntimePatchApplyResult | null;
  loading: boolean;
  onDryRun: () => void;
  onApply: (input: { confirmedText: string; allowDirtyWorkingTree: boolean }) => void;
}

export function PatchApplyPanel({
  patchProposal,
  patchDiff,
  sandboxResult,
  snapshot,
  applyResult,
  loading,
  onDryRun,
  onApply,
}: PatchApplyPanelProps) {
  const [confirmedText, setConfirmedText] = useState('');
  const [allowDirtyWorkingTree, setAllowDirtyWorkingTree] = useState(false);

  const canDryRun = Boolean(
    patchProposal?.validation.valid &&
    patchProposal.proposal.status === 'validated' &&
    patchDiff?.diff.safeToPreview,
  );

  const sandboxPassed = sandboxResult?.status === 'passed';

  const requiresSnapshot =
    patchProposal?.proposal.riskLevel === 'medium' || patchProposal?.proposal.riskLevel === 'high';

  const snapshotReady = !requiresSnapshot || Boolean(snapshot?.snapshot.snapshotId);

  const canApply = canDryRun && sandboxPassed && snapshotReady && confirmedText === 'APPLY';

  return (
    <article className="plan-summary-card">
      <div className="panel-title-row">
        <ShieldCheck size={18} />
        <div>
          <strong>Controlled apply</strong>
          <p className="muted">
            Real writes require safe diff, passed sandbox verification, approval and explicit text
            confirmation.
          </p>
        </div>
      </div>

      <div className="plan-step-badges">
        <Badge tone={canDryRun ? 'green' : 'slate'}>diff: {canDryRun ? 'ready' : 'missing'}</Badge>
        <Badge tone={sandboxTone(sandboxResult)}>
          sandbox: {sandboxResult?.status ?? 'missing'}
        </Badge>
        <Badge tone={requiresSnapshot ? 'yellow' : 'green'}>
          snapshot: {requiresSnapshot ? 'required' : 'optional'}
        </Badge>
        <Badge tone={snapshot ? 'green' : 'slate'}>
          snapshot state: {snapshot ? 'available' : 'none'}
        </Badge>
      </div>

      <div className="plan-actions">
        <button disabled={!canDryRun || loading} className="secondary-button" onClick={onDryRun}>
          {loading ? 'Running...' : 'Dry Run Apply'}
        </button>
      </div>

      {!sandboxPassed ? (
        <p className="muted">
          Real apply is locked until sandbox verification passes for the current proposal.
        </p>
      ) : null}

      {requiresSnapshot && !snapshot ? (
        <p className="muted">Medium/high-risk proposals require a snapshot before real apply.</p>
      ) : null}

      <label>
        Type APPLY to enable real apply
        <input
          value={confirmedText}
          onChange={(event) => setConfirmedText(event.target.value)}
          placeholder="APPLY"
        />
      </label>

      <label className="inline-toggle">
        <input
          type="checkbox"
          checked={allowDirtyWorkingTree}
          onChange={(event) => setAllowDirtyWorkingTree(event.target.checked)}
        />
        Allow dirty working tree
      </label>

      <div className="plan-actions">
        <button
          disabled={!canApply || loading}
          onClick={() => onApply({ confirmedText, allowDirtyWorkingTree })}
        >
          {loading ? 'Applying...' : 'Apply Controlled Patch'}
        </button>
      </div>

      {applyResult ? (
        <article className="plan-step-card">
          <div className="plan-step-content">
            <div className="plan-step-header">
              <strong>Apply result</strong>
              <Badge tone={toneForStatus(applyResult.status)}>{applyResult.status}</Badge>
            </div>

            <p className="muted">Apply ID: {applyResult.id}</p>

            {applyResult.operationResults.length > 0 ? (
              <div className="plan-step-list">
                {applyResult.operationResults.map((operation) => (
                  <article className="plan-step-card" key={operation.targetFile}>
                    <div className="plan-step-content">
                      <div className="plan-step-header">
                        <strong>{operation.targetFile}</strong>
                        <Badge tone={operation.status === 'applied' ? 'green' : 'yellow'}>
                          {operation.status}
                        </Badge>
                      </div>
                      <p>{operation.message}</p>
                      {operation.backup ? (
                        <p className="muted">Backup: {operation.backup.backupPath}</p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {applyResult.issues.length > 0 ? (
              <div className="plan-step-list">
                {applyResult.issues.map((issue) => (
                  <article className="plan-step-card" key={`${issue.code}-${issue.message}`}>
                    <div className="plan-step-content">
                      <div className="plan-step-header">
                        <strong>{issue.code}</strong>
                        <Badge tone={issue.severity === 'error' ? 'red' : 'yellow'}>
                          {issue.severity}
                        </Badge>
                      </div>
                      <p>{issue.message}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </article>
      ) : null}
    </article>
  );
}

function sandboxTone(
  sandbox: RuntimePatchSandboxResult | null,
): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
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

function toneForStatus(status: RuntimePatchApplyResult['status']) {
  if (status === 'applied' || status === 'dry_run') {
    return 'green';
  }

  if (status === 'blocked') {
    return 'yellow';
  }

  return 'red';
}
