import { useMemo, useState } from 'react';
import { Archive, RefreshCcw } from 'lucide-react';
import { Badge } from '../Badge';
import { RuntimeArtifactCard } from './RuntimeArtifactCard';
import type {
  RuntimeArtifactIndex,
  RuntimeArtifactKind,
  RuntimeArtifactSummary,
} from '../../types/runtime';

interface RuntimeArtifactStorePanelProps {
  index: RuntimeArtifactIndex | null;
  selectedArtifact: RuntimeArtifactSummary | null;
  selectedContent: string;
  loading?: boolean;
  onRefresh: () => void;
  onSelect: (artifact: RuntimeArtifactSummary) => void;
}

const artifactKinds: RuntimeArtifactKind[] = [
  'active_plan',
  'active_patch_proposal',
  'active_patch_diff',
  'runtime_plan',
  'patch_proposal',
  'patch_diff',
  'apply_report',
  'session_state',
  'task_state',
  'verify_runs',
  'session_decisions',
  'report_markdown',
  'report_json',
  'unknown',
];

export function RuntimeArtifactStorePanel({
  index,
  selectedArtifact,
  selectedContent,
  loading = false,
  onRefresh,
  onSelect,
}: RuntimeArtifactStorePanelProps) {
  const [kindFilter, setKindFilter] = useState<RuntimeArtifactKind | 'all'>('all');
  const [query, setQuery] = useState('');

  const artifacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return (index?.artifacts ?? []).filter((artifact) => {
      if (kindFilter !== 'all' && artifact.kind !== kindFilter) {
        return false;
      }

      if (normalizedQuery.length === 0) {
        return true;
      }

      return (
        artifact.path.toLowerCase().includes(normalizedQuery) ||
        artifact.label.toLowerCase().includes(normalizedQuery) ||
        artifact.sessionId?.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [index, kindFilter, query]);

  return (
    <section className="panel runtime-artifact-store-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <Archive size={18} />
          <div>
            <h2>Runtime Artifact Store</h2>
            <p className="muted">
              Central read-only index for plans, patches, diffs, reports, sessions and runtime
              state.
            </p>
          </div>
        </div>

        <div className="artifact-toolbar-actions">
          <Badge tone={index ? 'green' : 'slate'}>{index ? 'indexed' : 'idle'}</Badge>
          <Badge tone="blue">{index?.artifacts.length ?? 0} artifacts</Badge>

          <button className="secondary-button" disabled={loading} onClick={onRefresh}>
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="artifact-filters">
        <label>
          Filter
          <input
            value={query}
            placeholder="session id, file name, kind..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <label>
          Kind
          <select
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as RuntimeArtifactKind | 'all')}
          >
            <option value="all">all</option>
            {artifactKinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="artifact-store-grid">
        <section className="artifact-list">
          {artifacts.length === 0 ? (
            <article className="artifact-empty-state">
              <strong>No artifacts found.</strong>
              <p>Refresh the index or clear filters.</p>
            </article>
          ) : (
            artifacts.map((artifact) => (
              <RuntimeArtifactCard
                key={artifact.id}
                artifact={artifact}
                selected={selectedArtifact?.id === artifact.id}
                onSelect={onSelect}
              />
            ))
          )}
        </section>

        <section className="artifact-preview">
          {!selectedArtifact ? (
            <article className="artifact-empty-state">
              <strong>No artifact selected.</strong>
              <p>Select an artifact to inspect its raw content.</p>
            </article>
          ) : (
            <>
              <div className="artifact-preview-header">
                <div>
                  <strong>{selectedArtifact.label}</strong>
                  <p>{selectedArtifact.path}</p>
                </div>

                <Badge tone="blue">{selectedArtifact.kind}</Badge>
              </div>

              <pre>{selectedContent}</pre>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
