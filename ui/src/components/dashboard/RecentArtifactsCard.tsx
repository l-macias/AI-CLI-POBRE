import { Archive } from 'lucide-react';
import { Badge } from '../Badge';
import type { RuntimeArtifactIndex } from '../../types/runtime';

interface RecentArtifactsCardProps {
  index: RuntimeArtifactIndex | null;
  onOpenSession: () => void;
}

export function RecentArtifactsCard({ index, onOpenSession }: RecentArtifactsCardProps) {
  const artifacts = index?.artifacts.slice(0, 8) ?? [];

  return (
    <article className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-title-row">
          <Archive size={18} />
          <strong>Recent artifacts</strong>
        </div>

        <Badge tone={index ? 'green' : 'slate'}>{index?.artifacts.length ?? 0} indexed</Badge>
      </div>

      <div className="dashboard-list">
        {artifacts.length === 0 ? (
          <p className="muted">No artifacts indexed.</p>
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
