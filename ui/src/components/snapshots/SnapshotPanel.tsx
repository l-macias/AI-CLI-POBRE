import { useMemo, useState } from 'react';
import { Camera } from 'lucide-react';
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
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-6">
        <div className="flex items-start gap-3">
          <Camera size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Local Snapshot</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Create a rollback point before enabling controlled apply actions.
            </p>
          </div>
        </div>
        <Badge tone={snapshot ? 'green' : 'yellow'} className="shrink-0">
          {snapshot ? 'available' : 'missing'}
        </Badge>
      </div>

      <label className="flex flex-col gap-2 mb-4">
        <span className="text-sm font-medium text-zinc-300">Target files</span>
        <textarea
          rows={4}
          value={targetFilesText}
          disabled={!session || loading}
          onChange={(event) => setTargetFilesText(event.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-mono text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors resize-y disabled:opacity-50"
        />
      </label>

      <button
        className="w-full sm:w-auto self-end rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        disabled={!session || loading || targetFiles.length === 0}
        onClick={() => onCreateSnapshot(targetFiles)}
      >
        {loading ? 'Creating snapshot...' : 'Create snapshot'}
      </button>

      {snapshot ? (
        <article className="mt-6 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
          <strong className="block text-sm font-semibold text-emerald-200 mb-1">
            {snapshot.snapshot.snapshotId}
          </strong>
          <p className="text-xs text-emerald-200/70 mb-4">{snapshot.snapshot.snapshotRoot}</p>

          <div className="flex flex-wrap gap-2">
            {snapshotTargetFiles.length === 0 ? (
              <span className="text-xs text-zinc-500 italic">No target files recorded.</span>
            ) : (
              snapshotTargetFiles.map((filePath) => (
                <Badge key={filePath} tone="blue" className="text-[10px]">
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
