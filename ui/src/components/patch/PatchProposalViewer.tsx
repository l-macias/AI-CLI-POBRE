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
    <section className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <GitPullRequestDraft size={20} className="text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Patch Proposal</h2>
              <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
                Generate, review, sandbox-verify and apply patches through runtime gates.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {patchProposal ? (
              <Badge tone={patchProposal.proposal.status === 'rejected' ? 'red' : 'blue'}>
                {patchProposal.proposal.status}
              </Badge>
            ) : (
              <Badge tone="slate">empty</Badge>
            )}
          </div>
        </div>

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

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={!canGenerate || loading}
          onClick={onGeneratePatchProposal}
        >
          {loading ? 'Generating...' : 'Generate Patch Proposal'}
        </button>

        <button
          disabled={!canGenerateDiff || diffLoading}
          className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
          onClick={onGeneratePatchDiff}
        >
          {diffLoading ? 'Generating diff...' : 'Generate Diff Preview'}
        </button>

        <button
          disabled={!canVerifySandbox || sandboxLoading}
          className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
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
          className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
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
          className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
          onClick={onGenerateRecoveryProposal}
        >
          {recoveryProposalLoading ? 'Generating repaired patch...' : 'Generate Repaired Patch'}
        </button>

        <button
          disabled={!session}
          className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto focus:outline-none focus:ring-2 focus:ring-zinc-500"
          onClick={() => onCommand('/context')}
        >
          View context
        </button>
      </div>

      {!runtimePlan ? (
        <article className="flex flex-col items-center justify-center gap-3 p-10 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 mt-6">
          <strong className="block text-sm font-medium text-zinc-300">
            No runtime plan available.
          </strong>
          <p className="text-xs text-zinc-500">
            Generate and validate a Runtime Plan before requesting a patch proposal.
          </p>
        </article>
      ) : null}

      {runtimePlan && !runtimePlan.validation.valid ? (
        <article className="flex flex-col items-center justify-center gap-3 p-10 text-center rounded-xl border border-dashed border-red-500/30 bg-red-500/5 mt-6">
          <strong className="block text-sm font-medium text-red-300">
            Runtime plan is not valid.
          </strong>
          <p className="text-xs text-red-200/70">
            Patch proposals require a validated runtime plan.
          </p>
        </article>
      ) : null}

      {patchProposal ? (
        <div className="flex flex-col gap-6 mt-6">
          <PatchSummary result={patchProposal} />

          {patchProposal.validation.issues.length > 0 ? (
            <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm">
              <div className="flex items-start gap-3 border-b border-zinc-800/60 pb-4">
                <ShieldAlert size={18} className="text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-base font-medium text-zinc-100">
                    Validation issues
                  </strong>
                  <p className="text-sm text-zinc-400 mt-1">
                    Runtime policy warnings/errors for this patch proposal.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {patchProposal.validation.issues.map((issue) => (
                  <article
                    className="flex flex-col gap-2 p-3 rounded-md border border-zinc-800/40 bg-zinc-950/50"
                    key={`${issue.code}-${issue.path ?? 'global'}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <strong className="text-sm font-semibold text-zinc-200">{issue.code}</strong>
                      <Badge
                        tone={issue.severity === 'error' ? 'red' : 'yellow'}
                        className="shrink-0"
                      >
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400">{issue.message}</p>
                    {issue.path ? (
                      <span className="text-xs font-mono text-zinc-500 bg-zinc-900/50 p-1 rounded w-fit">
                        {issue.path}
                      </span>
                    ) : null}
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          <div className="flex flex-col gap-4">
            {patchProposal.proposal.files.map((file) => (
              <PatchFileCard file={file} key={file.path} />
            ))}
          </div>

          {patchProposal.proposal.risks.length > 0 ? (
            <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm">
              <div className="border-b border-zinc-800/60 pb-4">
                <strong className="block text-base font-medium text-zinc-100">Risks</strong>
                <p className="text-sm text-zinc-400 mt-1">
                  Patch risk analysis before diff/apply stages.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {patchProposal.proposal.risks.map((risk) => (
                  <article
                    className="flex flex-col gap-2 p-3 rounded-md border border-zinc-800/40 bg-zinc-950/50"
                    key={risk.code}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <strong className="text-sm font-semibold text-zinc-200">{risk.code}</strong>
                      <Badge
                        tone={
                          risk.level === 'high'
                            ? 'red'
                            : risk.level === 'medium'
                              ? 'yellow'
                              : 'green'
                        }
                        className="shrink-0"
                      >
                        {risk.level}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-300">{risk.message}</p>
                    <p className="text-xs text-zinc-500">{risk.mitigation}</p>
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          {patchProposal.proposal.verifyCommands.length > 0 ? (
            <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm">
              <div className="border-b border-zinc-800/60 pb-4">
                <strong className="block text-base font-medium text-zinc-100">
                  Suggested verify commands
                </strong>
                <p className="text-sm text-zinc-400 mt-1">
                  Sandbox verification runs approved safe commands before real apply.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {patchProposal.proposal.verifyCommands.map((verifyCommand) => (
                  <article
                    className="flex flex-col gap-2 p-4 rounded-md border border-zinc-800/40 bg-zinc-950/50"
                    key={`${verifyCommand.command}-${verifyCommand.args.join('-')}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                      <strong className="text-sm font-mono text-indigo-300 break-all">
                        {verifyCommand.command} {verifyCommand.args.join(' ')}
                      </strong>
                      <Badge tone="yellow" className="shrink-0">
                        approval required
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400">{verifyCommand.reason}</p>
                  </article>
                ))}
              </div>
            </article>
          ) : null}
        </div>
      ) : (
        <article className="flex flex-col items-center justify-center gap-3 p-10 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 mt-6">
          <strong className="block text-sm font-medium text-zinc-300">
            No patch proposal generated yet.
          </strong>
          <p className="text-xs text-zinc-500">
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
    <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm mt-6">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-800/60 pb-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <strong className="block text-base font-medium text-zinc-100">
              Sandbox verification
            </strong>
            <p className="text-sm text-zinc-400 mt-1">
              Patch was tested inside a sandbox workspace before real apply.
            </p>
          </div>
        </div>
        <Badge tone={tone} className="shrink-0">
          {result.status}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        {result.workspace ? (
          <p className="text-xs text-zinc-500 font-mono">
            Workspace: {result.workspace.workspaceRoot}
          </p>
        ) : null}

        {result.applyResult ? (
          <p className="text-xs text-zinc-500">Sandbox apply: {result.applyResult.status}</p>
        ) : null}
      </div>

      {result.verifyRuns.length > 0 ? (
        <div className="flex flex-col gap-4 mt-2">
          {result.verifyRuns.map((run) => (
            <article
              className="flex flex-col gap-3 p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50"
              key={`${run.command}-${run.startedAt}`}
            >
              <div className="flex justify-between items-start gap-3">
                <strong className="text-sm font-mono text-indigo-300 break-all">
                  {run.command}
                </strong>
                <Badge
                  tone={
                    run.status === 'blocked'
                      ? 'yellow'
                      : run.status === 'failed' || run.exitCode !== 0
                        ? 'red'
                        : 'green'
                  }
                  className="shrink-0"
                >
                  {run.status}
                  {run.exitCode !== undefined ? ` / ${run.exitCode}` : ''}
                </Badge>
              </div>

              {run.stdoutSummary ? (
                <pre className="p-3 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto break-all">
                  {run.stdoutSummary}
                </pre>
              ) : null}

              {run.stderrSummary ? (
                <pre className="p-3 rounded bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-300 overflow-x-auto break-all">
                  {run.stderrSummary}
                </pre>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {result.issues.length > 0 ? (
        <div className="flex flex-col gap-3 mt-2">
          {result.issues.map((issue) => (
            <article
              className="flex flex-col gap-2 p-3 rounded-md border border-red-500/20 bg-red-500/5"
              key={`${issue.code}-${issue.message}`}
            >
              <div className="flex justify-between items-start gap-3">
                <strong className="text-sm font-semibold text-red-300">{issue.code}</strong>
                <Badge tone={issue.severity === 'error' ? 'red' : 'yellow'} className="shrink-0">
                  {issue.severity}
                </Badge>
              </div>
              <p className="text-xs text-red-200/70">{issue.message}</p>
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
    <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm mt-6">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-800/60 pb-4">
        <div className="flex items-start gap-3">
          <ShieldAlert size={18} className="text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <strong className="block text-base font-medium text-zinc-100">Patch recovery</strong>
            <p className="text-sm text-zinc-400 mt-1">
              Runtime prepared a failure report and repair prompt after sandbox failure.
            </p>
          </div>
        </div>
        <Badge tone={tone} className="shrink-0">
          {result.status}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-400">
          Attempt{' '}
          <strong className="text-zinc-200">
            {Math.min(result.currentAttempt, result.maxAttempts)}/{result.maxAttempts}
          </strong>
          {result.currentAttempt > result.maxAttempts ? ' · limit reached' : ''}
        </p>

        {result.status === 'max_attempts_reached' ? (
          <p className="text-sm text-yellow-500/80">
            Recovery stopped because the maximum number of repair attempts was reached. Review the
            failure report manually before continuing.
          </p>
        ) : null}

        {result.status === 'not_recoverable' ? (
          <p className="text-sm text-red-400/80">
            Runtime marked this patch failure as not recoverable. Review the issues before
            requesting another patch.
          </p>
        ) : null}
      </div>

      {result.issues.length > 0 ? (
        <div className="flex flex-col gap-3 mt-2">
          {result.issues.map((issue) => (
            <article
              className="flex flex-col gap-2 p-3 rounded-md border border-red-500/20 bg-red-500/5"
              key={`${issue.code}-${issue.message}`}
            >
              <div className="flex justify-between items-start gap-3">
                <strong className="text-sm font-semibold text-red-300">{issue.code}</strong>
                <Badge tone={issue.severity === 'error' ? 'red' : 'yellow'} className="shrink-0">
                  {issue.severity}
                </Badge>
              </div>
              <p className="text-xs text-red-200/70">{issue.message}</p>
            </article>
          ))}
        </div>
      ) : null}

      {firstAttempt ? (
        <div className="flex flex-col gap-4 mt-2">
          <article className="flex flex-col gap-4 p-5 rounded-lg border border-zinc-800/40 bg-zinc-950/50">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-800/60 pb-3">
              <strong className="text-sm font-semibold text-zinc-200">
                {firstAttempt.failureReport.summary}
              </strong>
              <Badge
                tone={firstAttempt.failureReport.status === 'failed' ? 'red' : 'yellow'}
                className="shrink-0"
              >
                {firstAttempt.failureReport.status}
              </Badge>
            </div>

            <p className="text-sm text-zinc-400">
              <span className="font-semibold text-zinc-500 mr-2">Failed files:</span>
              <span className="font-mono">{firstAttempt.failureReport.failedFiles.join(', ')}</span>
            </p>

            <div className="flex flex-col gap-2 mt-2">
              <strong className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Repair prompt
              </strong>
              <pre className="p-4 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {firstAttempt.repairPrompt.user}
              </pre>
            </div>
          </article>
        </div>
      ) : null}
    </article>
  );
}
