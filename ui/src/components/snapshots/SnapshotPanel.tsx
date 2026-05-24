import { useMemo, useState } from 'react';
import { Badge } from '../Badge';
import type { CreateSnapshotResult, InteractiveSessionState } from '../../types/runtime';

interface SnapshotPanelProps {
  session: InteractiveSessionState | null;
  snapshot: CreateSnapshotResult | null;
  loading?: boolean;
  onCreateSnapshot: (targetFiles: string[]) => void;
}

export function SnapshotPanel({
  session,
  snapshot,
  loading = false,
  onCreateSnapshot,
}: SnapshotPanelProps) {
  const [targetFilesText, setTargetFilesText] = useState('package.json');

  const targetFiles = useMemo(() => {
    return targetFilesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }, [targetFilesText]);

  const snapshotTargetFiles = snapshot?.snapshot?.targetFiles ?? [];

  return (
    <section className="panel snapshot-panel">
      <div className="panel-header">
        <div>
          <h2>Local Snapshot</h2>
          <p className="muted">Create a rollback point before enabling controlled apply actions.</p>
        </div>

        <Badge tone={snapshot ? 'green' : 'yellow'}>{snapshot ? 'available' : 'missing'}</Badge>
      </div>

      <label>
        Target files
        <textarea
          rows={4}
          value={targetFilesText}
          disabled={!session || loading}
          onChange={(event) => setTargetFilesText(event.target.value)}
        />
      </label>

      <button
        disabled={!session || loading || targetFiles.length === 0}
        onClick={() => onCreateSnapshot(targetFiles)}
      >
        {loading ? 'Creating snapshot...' : 'Create snapshot'}
      </button>

      {snapshot ? (
        <article className="snapshot-result-card">
          <strong>{snapshot.snapshot.snapshotId}</strong>
          <p className="muted">{snapshot.snapshot.snapshotRoot}</p>

          <div className="snapshot-file-list">
            {snapshotTargetFiles.length === 0 ? (
              <span className="muted">No target files recorded.</span>
            ) : (
              snapshotTargetFiles.map((filePath) => (
                <Badge key={filePath} tone="blue">
                  {filePath}
                </Badge>
              ))
            )}
          </div>
        </article>
      ) : null}
    </section>
  );
}
