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
    <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm mt-6">
      <div className="flex items-start gap-3 border-b border-zinc-800/60 pb-4">
        <ShieldCheck size={18} className="text-emerald-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <strong className="block text-base font-medium text-zinc-100">Controlled apply</strong>
          <p className="text-sm text-zinc-400 mt-1">
            Real writes require safe diff, passed sandbox verification, approval and explicit text
            confirmation.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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

      <div className="flex items-center gap-3">
        <button
          disabled={!canDryRun || loading}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={onDryRun}
        >
          {loading ? 'Running...' : 'Dry Run Apply'}
        </button>
      </div>

      {!sandboxPassed ? (
        <p className="text-sm text-yellow-500/80">
          Real apply is locked until sandbox verification passes for the current proposal.
        </p>
      ) : null}

      {requiresSnapshot && !snapshot ? (
        <p className="text-sm text-yellow-500/80">
          Medium/high-risk proposals require a snapshot before real apply.
        </p>
      ) : null}

      <div className="flex flex-col gap-4 p-4 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-300">
            Type <span className="font-mono text-emerald-400">APPLY</span> to enable real apply
          </span>
          <input
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            value={confirmedText}
            onChange={(event) => setConfirmedText(event.target.value)}
            placeholder="APPLY"
          />
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
            checked={allowDirtyWorkingTree}
            onChange={(event) => setAllowDirtyWorkingTree(event.target.checked)}
          />
          <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
            Allow dirty working tree
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          disabled={!canApply || loading}
          onClick={() => onApply({ confirmedText, allowDirtyWorkingTree })}
        >
          {loading ? 'Applying...' : 'Apply Controlled Patch'}
        </button>
      </div>

      {applyResult ? (
        <article className="flex flex-col gap-4 p-5 rounded-lg border border-zinc-800/60 bg-zinc-950/50 mt-4">
          <div className="flex justify-between items-start gap-4 border-b border-zinc-800/60 pb-3">
            <div>
              <strong className="block text-sm font-semibold text-zinc-200">Apply result</strong>
              <p className="text-xs text-zinc-500 mt-1 font-mono">Apply ID: {applyResult.id}</p>
            </div>
            <Badge tone={toneForStatus(applyResult.status)}>{applyResult.status}</Badge>
          </div>

          {applyResult.operationResults.length > 0 ? (
            <div className="flex flex-col gap-3">
              {applyResult.operationResults.map((operation) => (
                <article
                  className="flex flex-col gap-2 p-3 rounded-md border border-zinc-800/40 bg-zinc-900/50"
                  key={operation.targetFile}
                >
                  <div className="flex justify-between items-start gap-3">
                    <strong className="text-sm font-mono text-zinc-300 break-all">
                      {operation.targetFile}
                    </strong>
                    <Badge
                      tone={operation.status === 'applied' ? 'green' : 'yellow'}
                      className="shrink-0"
                    >
                      {operation.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400">{operation.message}</p>
                  {operation.backup ? (
                    <p className="text-xs text-zinc-500 font-mono mt-1">
                      Backup: {operation.backup.backupPath}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}

          {applyResult.issues.length > 0 ? (
            <div className="flex flex-col gap-3">
              {applyResult.issues.map((issue) => (
                <article
                  className="flex flex-col gap-2 p-3 rounded-md border border-red-500/20 bg-red-500/5"
                  key={`${issue.code}-${issue.message}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <strong className="text-sm font-semibold text-red-300">{issue.code}</strong>
                    <Badge
                      tone={issue.severity === 'error' ? 'red' : 'yellow'}
                      className="shrink-0"
                    >
                      {issue.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-red-200/70">{issue.message}</p>
                </article>
              ))}
            </div>
          ) : null}
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
