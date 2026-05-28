import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../Badge';
import type { RuntimePatchApplyResult, RuntimePatchRollbackResult } from '../../types/runtime';

interface PatchRollbackPanelProps {
  applyResult: RuntimePatchApplyResult | null;
  rollbackResult: RuntimePatchRollbackResult | null;
  loading: boolean;
  onDryRunRollback: () => void;
  onRollback: (input: { confirmedText: string }) => void;
}

export function PatchRollbackPanel({
  applyResult,
  rollbackResult,
  loading,
  onDryRunRollback,
  onRollback,
}: PatchRollbackPanelProps) {
  const [confirmedText, setConfirmedText] = useState('');

  const canRollback = applyResult?.status === 'applied';
  const confirmed = confirmedText === 'ROLLBACK';

  return (
    <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm mt-6">
      <div className="flex items-start gap-3 border-b border-zinc-800/60 pb-4">
        <RotateCcw size={18} className="text-yellow-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <strong className="block text-base font-medium text-zinc-100">Controlled rollback</strong>
          <p className="text-sm text-zinc-400 mt-1">
            Restores files from runtime backups. This does not use git reset.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={canRollback ? 'green' : 'slate'}>apply: {applyResult?.status ?? 'none'}</Badge>
        <Badge tone="yellow">confirmation required</Badge>
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={!canRollback || loading}
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={onDryRunRollback}
        >
          {loading ? 'Running...' : 'Dry Run Rollback'}
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-300">
            Type <span className="font-mono text-yellow-400">ROLLBACK</span> to enable rollback
          </span>
          <input
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            value={confirmedText}
            onChange={(event) => setConfirmedText(event.target.value)}
            placeholder="ROLLBACK"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="rounded-lg bg-yellow-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
          disabled={!canRollback || !confirmed || loading}
          onClick={() => onRollback({ confirmedText })}
        >
          {loading ? 'Rolling back...' : 'Rollback Controlled Patch'}
        </button>
      </div>

      {rollbackResult ? (
        <article className="flex flex-col gap-4 p-5 rounded-lg border border-zinc-800/60 bg-zinc-950/50 mt-4">
          <div className="flex justify-between items-start gap-4 border-b border-zinc-800/60 pb-3">
            <div>
              <strong className="block text-sm font-semibold text-zinc-200">Rollback result</strong>
              <p className="text-xs text-zinc-500 mt-1 font-mono">
                Rollback ID: {rollbackResult.id}
              </p>
            </div>
            <Badge tone={toneForRollbackStatus(rollbackResult.status)}>
              {rollbackResult.status}
            </Badge>
          </div>

          {rollbackResult.operationResults.length > 0 ? (
            <div className="flex flex-col gap-3">
              {rollbackResult.operationResults.map((operation) => (
                <article
                  className="flex flex-col gap-2 p-3 rounded-md border border-zinc-800/40 bg-zinc-900/50"
                  key={operation.targetFile}
                >
                  <div className="flex justify-between items-start gap-3">
                    <strong className="text-sm font-mono text-zinc-300 break-all">
                      {operation.targetFile}
                    </strong>
                    <Badge tone={toneForOperationStatus(operation.status)} className="shrink-0">
                      {operation.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400">{operation.message}</p>
                  {operation.backupPath ? (
                    <p className="text-xs text-zinc-500 font-mono mt-1">
                      Backup: {operation.backupPath}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}

          {rollbackResult.issues.length > 0 ? (
            <div className="flex flex-col gap-3">
              {rollbackResult.issues.map((issue) => (
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

function toneForRollbackStatus(status: RuntimePatchRollbackResult['status']) {
  if (status === 'rolled_back' || status === 'dry_run') {
    return 'green';
  }

  if (status === 'blocked') {
    return 'yellow';
  }

  return 'red';
}

function toneForOperationStatus(
  status: RuntimePatchRollbackResult['operationResults'][number]['status'],
) {
  if (status === 'restored' || status === 'deleted_created_file') {
    return 'green';
  }

  if (status === 'skipped') {
    return 'yellow';
  }

  return 'red';
}
