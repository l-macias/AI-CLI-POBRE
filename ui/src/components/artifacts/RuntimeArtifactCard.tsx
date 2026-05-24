import { FileJson, FileText } from 'lucide-react';
import { Badge } from '../Badge';
import type { RuntimeArtifactSummary } from '../../types/runtime';

interface RuntimeArtifactCardProps {
  artifact: RuntimeArtifactSummary;
  selected: boolean;
  onSelect: (artifact: RuntimeArtifactSummary) => void;
}

export function RuntimeArtifactCard({ artifact, selected, onSelect }: RuntimeArtifactCardProps) {
  return (
    <button
      className={`artifact-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(artifact)}
    >
      <div className="artifact-card-icon">
        {artifact.path.endsWith('.md') ? <FileText size={18} /> : <FileJson size={18} />}
      </div>

      <div className="artifact-card-body">
        <strong>{artifact.label}</strong>
        <span>{artifact.path}</span>

        <div className="artifact-card-meta">
          <Badge tone={toneForKind(artifact.kind)}>{artifact.kind}</Badge>
          {artifact.sessionId ? <Badge tone="blue">{artifact.sessionId}</Badge> : null}
          <Badge tone="slate">{formatSize(artifact.sizeBytes)}</Badge>
        </div>
      </div>
    </button>
  );
}

function toneForKind(kind: RuntimeArtifactSummary['kind']) {
  if (kind.startsWith('active_')) {
    return 'green';
  }

  if (kind.includes('patch')) {
    return 'yellow';
  }

  if (kind.includes('report')) {
    return 'blue';
  }

  if (kind === 'unknown') {
    return 'slate';
  }

  return 'blue';
}

function formatSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${String(sizeBytes)} B`;
  }

  return `${String(Math.round(sizeBytes / 1024))} KB`;
}
