import { GitPullRequestDraft, ShieldAlert } from 'lucide-react';
import { Badge } from '../Badge';
import { PatchFileCard } from './PatchFileCard';
import { PatchSummary } from './PatchSummary';
import { PatchDiffPreview } from './PatchDiffPreview';
import { PatchApplyPanel } from './PatchApplyPanel';
import { PatchRollbackPanel } from './PatchRollbackPanel';
import type {
  InteractiveSessionState,
  RuntimePatchProposalGenerateResult,
  RuntimePlanGenerateResult,
  RuntimePatchDiffGenerateResult,
  RuntimePatchApplyResult,
  SnapshotManifest,
  RuntimePatchRollbackResult,
} from '../../types/runtime';

interface PatchProposalViewerProps {
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

export function PatchProposalViewer({
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
}: PatchProposalViewerProps) {
  const canGenerate = Boolean(
    session && runtimePlan?.validation.valid && runtimePlan.plan.status === 'validated',
  );
  const canGenerateDiff = Boolean(
    session && patchProposal?.validation.valid && patchProposal.proposal.status === 'validated',
  );
  return (
    <section className="plan-viewer">
      <div className="panel-header">
        <div className="panel-title-row">
          <GitPullRequestDraft size={18} />
          <div>
            <h2>Patch Proposal</h2>
            <p className="muted">
              Generate a proposal from the validated runtime plan. No apply action exists here.
            </p>
          </div>
        </div>

        {patchProposal ? (
          <Badge tone={patchProposal.proposal.status === 'rejected' ? 'red' : 'blue'}>
            {patchProposal.proposal.status}
          </Badge>
        ) : (
          <Badge tone="slate">empty</Badge>
        )}
        {patchDiff ? <PatchDiffPreview result={patchDiff} /> : null}
        {patchDiff ? (
          <PatchApplyPanel
            patchProposal={patchProposal}
            patchDiff={patchDiff}
            snapshot={snapshot}
            applyResult={applyResult}
            loading={applyLoading}
            onDryRun={onDryRunApply}
            onApply={onApplyPatch}
          />
        ) : null}
        {applyResult ? (
          <PatchRollbackPanel
            applyResult={applyResult}
            rollbackResult={rollbackResult}
            loading={rollbackLoading}
            onDryRunRollback={onDryRunRollback}
            onRollback={onRollbackPatch}
          />
        ) : null}
      </div>

      <div className="plan-actions">
        <button disabled={!canGenerate || loading} onClick={onGeneratePatchProposal}>
          {loading ? 'Generating...' : 'Generate Patch Proposal'}
        </button>
        <button
          disabled={!canGenerateDiff || diffLoading}
          className="secondary-button"
          onClick={onGeneratePatchDiff}
        >
          {diffLoading ? 'Generating diff...' : 'Generate Diff Preview'}
        </button>
        <button
          disabled={!session}
          className="secondary-button"
          onClick={() => onCommand('/context')}
        >
          View context
        </button>
      </div>

      {!runtimePlan ? (
        <article className="empty-plan-state">
          <strong>No runtime plan available.</strong>
          <p className="muted">
            Generate and validate a Runtime Plan before requesting a patch proposal.
          </p>
        </article>
      ) : null}

      {runtimePlan && !runtimePlan.validation.valid ? (
        <article className="empty-plan-state">
          <strong>Runtime plan is not valid.</strong>
          <p className="muted">Patch proposals require a validated runtime plan.</p>
        </article>
      ) : null}

      {patchProposal ? (
        <>
          <PatchSummary result={patchProposal} />

          {patchProposal.validation.issues.length > 0 ? (
            <article className="plan-summary-card">
              <div className="panel-title-row">
                <ShieldAlert size={18} />
                <div>
                  <strong>Validation issues</strong>
                  <p className="muted">Runtime policy warnings/errors for this patch proposal.</p>
                </div>
              </div>

              <div className="plan-step-list">
                {patchProposal.validation.issues.map((issue) => (
                  <article
                    className="plan-step-card"
                    key={`${issue.code}-${issue.path ?? 'global'}`}
                  >
                    <div className="plan-step-content">
                      <div className="plan-step-header">
                        <strong>{issue.code}</strong>
                        <Badge tone={issue.severity === 'error' ? 'red' : 'yellow'}>
                          {issue.severity}
                        </Badge>
                      </div>
                      <p>{issue.message}</p>
                      {issue.path ? <span className="plan-step-target">{issue.path}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          <div className="plan-step-list">
            {patchProposal.proposal.files.map((file) => (
              <PatchFileCard file={file} key={file.path} />
            ))}
          </div>

          {patchProposal.proposal.risks.length > 0 ? (
            <article className="plan-summary-card">
              <div>
                <strong>Risks</strong>
                <p className="muted">Patch risk analysis before diff/apply stages.</p>
              </div>

              <div className="plan-step-list">
                {patchProposal.proposal.risks.map((risk) => (
                  <article className="plan-step-card" key={risk.code}>
                    <div className="plan-step-content">
                      <div className="plan-step-header">
                        <strong>{risk.code}</strong>
                        <Badge
                          tone={
                            risk.level === 'high'
                              ? 'red'
                              : risk.level === 'medium'
                                ? 'yellow'
                                : 'green'
                          }
                        >
                          {risk.level}
                        </Badge>
                      </div>
                      <p>{risk.message}</p>
                      <p className="muted">{risk.mitigation}</p>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          {patchProposal.proposal.verifyCommands.length > 0 ? (
            <article className="plan-summary-card">
              <div>
                <strong>Suggested verify commands</strong>
                <p className="muted">Verification still requires explicit approval.</p>
              </div>

              <div className="plan-step-list">
                {patchProposal.proposal.verifyCommands.map((verifyCommand) => (
                  <article
                    className="plan-step-card"
                    key={`${verifyCommand.command}-${verifyCommand.args.join('-')}`}
                  >
                    <div className="plan-step-content">
                      <div className="plan-step-header">
                        <strong>
                          {verifyCommand.command} {verifyCommand.args.join(' ')}
                        </strong>
                        <Badge tone="yellow">approval required</Badge>
                      </div>
                      <p>{verifyCommand.reason}</p>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ) : null}
        </>
      ) : (
        <article className="empty-plan-state">
          <strong>No patch proposal generated yet.</strong>
          <p className="muted">
            This stage only creates and validates a proposal. It does not write files.
          </p>
        </article>
      )}
    </section>
  );
}
