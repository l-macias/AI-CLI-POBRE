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
      className={`flex items-start gap-4 p-4 rounded-xl border transition-colors text-left w-full cursor-pointer group ${
        selected
          ? 'border-indigo-500/50 bg-indigo-500/5'
          : 'border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700'
      }`}
      onClick={() => onSelect(artifact)}
    >
      <div
        className={`mt-0.5 flex items-center justify-center transition-colors ${selected ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}
      >
        {artifact.path.endsWith('.md') ? <FileText size={18} /> : <FileJson size={18} />}
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <strong
          className={`text-sm font-medium truncate ${selected ? 'text-indigo-300' : 'text-zinc-200'}`}
        >
          {artifact.label}
        </strong>
        <span className="text-xs text-zinc-500 font-mono mt-0.5 truncate">{artifact.path}</span>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Badge tone={toneForKind(artifact.kind)}>{artifact.kind}</Badge>
          {artifact.sessionId ? (
            <span className="truncate max-w-30 block">
              <Badge tone="blue">{artifact.sessionId}</Badge>
            </span>
          ) : null}
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
