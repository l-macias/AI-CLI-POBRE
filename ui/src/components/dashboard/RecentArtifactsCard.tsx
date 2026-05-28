import { Archive } from 'lucide-react';
import { Badge } from '../Badge';
import type { RuntimeArtifactIndex } from '../../types/runtime';

interface RecentArtifactsCardProps {
  index: RuntimeArtifactIndex | null;
  onOpenSession: () => void;
}

export function RecentArtifactsCard({ index, onOpenSession }: RecentArtifactsCardProps) {
  const activeArtifacts =
    index?.artifacts.filter((artifact) => !artifact.path.startsWith('archive/')) ?? [];

  const artifacts = activeArtifacts.slice(0, 8);

  return (
    <article className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-title-row">
          <Archive size={18} />
          <strong>Recent active artifacts</strong>
        </div>

        <Badge tone={index ? 'green' : 'slate'}>{activeArtifacts.length} active</Badge>
      </div>

      <div className="dashboard-list">
        {artifacts.length === 0 ? (
          <p className="muted">
            No active artifacts indexed. Archived evidence is preserved under Settings &gt; Runtime
            data.
          </p>
        ) : (
          artifacts.map((artifact) => (
            <button key={artifact.id} className="dashboard-list-row" onClick={onOpenSession}>
              <strong>{artifact.label}</strong>
              <span>{artifact.path}</span>
              <small>{artifact.kind}</small>
            </button>
          ))
        )}
      </div>

      <button className="secondary-button" onClick={onOpenSession}>
        Open Artifact Store
      </button>
    </article>
  );
}
