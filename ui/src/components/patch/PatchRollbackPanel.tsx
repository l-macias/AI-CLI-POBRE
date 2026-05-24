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
    <article className="plan-summary-card">
      <div className="panel-title-row">
        <RotateCcw size={18} />
        <div>
          <strong>Controlled rollback</strong>
          <p className="muted">Restores files from runtime backups. This does not use git reset.</p>
        </div>
      </div>

      <div className="plan-step-badges">
        <Badge tone={canRollback ? 'green' : 'slate'}>apply: {applyResult?.status ?? 'none'}</Badge>
        <Badge tone="yellow">confirmation required</Badge>
      </div>

      <div className="plan-actions">
        <button
          disabled={!canRollback || loading}
          className="secondary-button"
          onClick={onDryRunRollback}
        >
          {loading ? 'Running...' : 'Dry Run Rollback'}
        </button>
      </div>

      <label>
        Type ROLLBACK to enable rollback
        <input
          value={confirmedText}
          onChange={(event) => setConfirmedText(event.target.value)}
          placeholder="ROLLBACK"
        />
      </label>

      <div className="plan-actions">
        <button
          disabled={!canRollback || !confirmed || loading}
          onClick={() => onRollback({ confirmedText })}
        >
          {loading ? 'Rolling back...' : 'Rollback Controlled Patch'}
        </button>
      </div>

      {rollbackResult ? (
        <article className="plan-step-card">
          <div className="plan-step-content">
            <div className="plan-step-header">
              <strong>Rollback result</strong>
              <Badge tone={toneForRollbackStatus(rollbackResult.status)}>
                {rollbackResult.status}
              </Badge>
            </div>

            <p className="muted">Rollback ID: {rollbackResult.id}</p>

            {rollbackResult.operationResults.length > 0 ? (
              <div className="plan-step-list">
                {rollbackResult.operationResults.map((operation) => (
                  <article className="plan-step-card" key={operation.targetFile}>
                    <div className="plan-step-content">
                      <div className="plan-step-header">
                        <strong>{operation.targetFile}</strong>
                        <Badge tone={toneForOperationStatus(operation.status)}>
                          {operation.status}
                        </Badge>
                      </div>
                      <p>{operation.message}</p>
                      {operation.backupPath ? (
                        <p className="muted">Backup: {operation.backupPath}</p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {rollbackResult.issues.length > 0 ? (
              <div className="plan-step-list">
                {rollbackResult.issues.map((issue) => (
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
