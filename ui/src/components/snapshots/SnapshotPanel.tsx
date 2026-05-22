import { Camera, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { CreateSnapshotResult, InteractiveSessionState } from '../../types/runtime';
import { Badge } from '../Badge';

interface SnapshotPanelProps {
  session: InteractiveSessionState | null;
  snapshot: CreateSnapshotResult | null;
  loading: boolean;
  onCreateSnapshot: (targetFiles: string[]) => void;
}

export function SnapshotPanel({
  session,
  snapshot,
  loading,
  onCreateSnapshot,
}: SnapshotPanelProps) {
  const [targetFilesText, setTargetFilesText] = useState('package.json');

  const targetFiles = targetFilesText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <section className="panel snapshot-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <Camera size={18} />
          <div>
            <h2>Local Snapshot</h2>
            <p className="muted">
              Create a rollback point before enabling controlled apply actions.
            </p>
          </div>
        </div>

        <Badge tone={snapshot ? 'green' : 'yellow'}>{snapshot ? 'ready' : 'missing'}</Badge>
      </div>

      <label>
        Target files
        <textarea
          rows={4}
          value={targetFilesText}
          onChange={(event) => setTargetFilesText(event.target.value)}
        />
      </label>

      <button
        disabled={!session || loading || targetFiles.length === 0}
        onClick={() => onCreateSnapshot(targetFiles)}
      >
        <ShieldCheck size={16} />
        {loading ? 'Creating snapshot...' : 'Create snapshot'}
      </button>

      {snapshot ? (
        <article className="snapshot-result-card">
          <strong>Snapshot created</strong>
          <p className="muted">Snapshot ID:</p>
          <code>{snapshot.snapshot.snapshotId}</code>

          <p className="muted">Manifest:</p>
          <code>{snapshot.manifestPath}</code>

          <p className="muted">Files:</p>
          <div className="snapshot-file-list">
            {snapshot.snapshot.targetFiles.map((file) => (
              <Badge key={file} tone="blue">
                {file}
              </Badge>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}
