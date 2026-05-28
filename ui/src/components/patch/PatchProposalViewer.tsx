import { GitPullRequestDraft, ShieldAlert, ShieldCheck } from 'lucide-react';
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
  RuntimePatchSandboxResult,
  RuntimePatchRecoveryResult,
} from '../../types/runtime';

interface PatchProposalViewerProps {
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

export function PatchProposalViewer({
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
}: PatchProposalViewerProps) {
  const canGenerate = Boolean(
    session && runtimePlan?.validation.valid && runtimePlan.plan.status === 'validated',
  );

  const canGenerateDiff = Boolean(
    session && patchProposal?.validation.valid && patchProposal.proposal.status === 'validated',
  );

  const canVerifySandbox = Boolean(
    session &&
    patchProposal?.validation.valid &&
    patchProposal.proposal.status === 'validated' &&
    patchDiff?.diff.safeToPreview === true,
  );

  return (
    <section className="plan-viewer">
      <div className="panel-header">
        <div className="panel-title-row">
          <GitPullRequestDraft size={18} />
          <div>
            <h2>Patch Proposal</h2>
            <p className="muted">
              Generate, review, sandbox-verify and apply patches through runtime gates.
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

        {sandboxResult ? <PatchSandboxResultCard result={sandboxResult} /> : null}
        {recoveryResult ? <PatchRecoveryResultCard result={recoveryResult} /> : null}

        {patchDiff ? (
          <PatchApplyPanel
            patchProposal={patchProposal}
            patchDiff={patchDiff}
            sandboxResult={sandboxResult}
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
          disabled={!canVerifySandbox || sandboxLoading}
          className="secondary-button"
          onClick={onVerifySandbox}
        >
          {sandboxLoading ? 'Verifying sandbox...' : 'Verify in Sandbox'}
        </button>
        <button
          disabled={
            !sandboxResult ||
            sandboxResult.status === 'passed' ||
            recoveryLoading ||
            recoveryResult?.status === 'max_attempts_reached' ||
            recoveryResult?.status === 'not_recoverable'
          }
          className="secondary-button"
          onClick={onPrepareRecovery}
        >
          {recoveryLoading
            ? 'Preparing recovery...'
            : recoveryResult?.status === 'max_attempts_reached'
              ? 'Max Attempts Reached'
              : recoveryResult?.status === 'not_recoverable'
                ? 'Not Recoverable'
                : 'Prepare Recovery'}
        </button>
        <button
          disabled={
            !recoveryResult ||
            recoveryResult.status !== 'repair_prompt_ready' ||
            recoveryProposalLoading
          }
          className="secondary-button"
          onClick={onGenerateRecoveryProposal}
        >
          {recoveryProposalLoading ? 'Generating repaired patch...' : 'Generate Repaired Patch'}
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
                <p className="muted">
                  Sandbox verification runs approved safe commands before real apply.
                </p>
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

function PatchSandboxResultCard({ result }: { result: RuntimePatchSandboxResult }) {
  const tone =
    result.status === 'passed' ? 'green' : result.status === 'blocked' ? 'yellow' : 'red';

  return (
    <article className="plan-summary-card">
      <div className="panel-title-row">
        <ShieldCheck size={18} />
        <div>
          <strong>Sandbox verification</strong>
          <p className="muted">Patch was tested inside a sandbox workspace before real apply.</p>
        </div>
        <Badge tone={tone}>{result.status}</Badge>
      </div>

      {result.workspace ? (
        <p className="muted">Workspace: {result.workspace.workspaceRoot}</p>
      ) : null}

      {result.applyResult ? (
        <p className="muted">Sandbox apply: {result.applyResult.status}</p>
      ) : null}

      {result.verifyRuns.length > 0 ? (
        <div className="plan-step-list">
          {result.verifyRuns.map((run) => (
            <article className="plan-step-card" key={`${run.command}-${run.startedAt}`}>
              <div className="plan-step-content">
                <div className="plan-step-header">
                  <strong>{run.command}</strong>
                  <Badge
                    tone={
                      run.status === 'blocked'
                        ? 'yellow'
                        : run.status === 'failed' || run.exitCode !== 0
                          ? 'red'
                          : 'green'
                    }
                  >
                    {run.status}
                    {run.exitCode !== undefined ? ` / ${run.exitCode}` : ''}
                  </Badge>
                </div>

                {run.stdoutSummary ? (
                  <pre className="runtime-code-block">{run.stdoutSummary}</pre>
                ) : null}

                {run.stderrSummary ? (
                  <pre className="runtime-code-block">{run.stderrSummary}</pre>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {result.issues.length > 0 ? (
        <div className="plan-step-list">
          {result.issues.map((issue) => (
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
    </article>
  );
}
function PatchRecoveryResultCard({ result }: { result: RuntimePatchRecoveryResult }) {
  const tone =
    result.status === 'repair_prompt_ready'
      ? 'green'
      : result.status === 'max_attempts_reached'
        ? 'yellow'
        : 'red';

  const firstAttempt = result.attempts[0];

  return (
    <article className="plan-summary-card">
      <div className="panel-title-row">
        <ShieldAlert size={18} />
        <div>
          <strong>Patch recovery</strong>
          <p className="muted">
            Runtime prepared a failure report and repair prompt after sandbox failure.
          </p>
        </div>
        <Badge tone={tone}>{result.status}</Badge>
      </div>

      <p className="muted">
        Attempt {Math.min(result.currentAttempt, result.maxAttempts)}/{result.maxAttempts}
        {result.currentAttempt > result.maxAttempts ? ' · limit reached' : ''}
      </p>
      {result.status === 'max_attempts_reached' ? (
        <p className="muted">
          Recovery stopped because the maximum number of repair attempts was reached. Review the
          failure report manually before continuing.
        </p>
      ) : null}

      {result.status === 'not_recoverable' ? (
        <p className="muted">
          Runtime marked this patch failure as not recoverable. Review the issues before requesting
          another patch.
        </p>
      ) : null}
      {result.issues.length > 0 ? (
        <div className="plan-step-list">
          {result.issues.map((issue) => (
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

      {firstAttempt ? (
        <div className="plan-step-list">
          <article className="plan-step-card">
            <div className="plan-step-content">
              <div className="plan-step-header">
                <strong>{firstAttempt.failureReport.summary}</strong>
                <Badge tone={firstAttempt.failureReport.status === 'failed' ? 'red' : 'yellow'}>
                  {firstAttempt.failureReport.status}
                </Badge>
              </div>

              <p className="muted">
                Failed files: {firstAttempt.failureReport.failedFiles.join(', ')}
              </p>

              <strong>Repair prompt</strong>
              <pre className="runtime-code-block">{firstAttempt.repairPrompt.user}</pre>
            </div>
          </article>
        </div>
      ) : null}
    </article>
  );
}
