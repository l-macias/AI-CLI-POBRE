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
    <article className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 shadow-sm h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-zinc-100">
          <Archive size={18} className="text-indigo-400" />
          <strong className="font-medium text-base">Recent active artifacts</strong>
        </div>

        <Badge tone={index ? 'green' : 'slate'}>{activeArtifacts.length} active</Badge>
      </div>

      <div className="flex flex-col gap-2 flex-1 mb-5">
        {artifacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg bg-zinc-950/50 border border-dashed border-zinc-800 h-full">
            <p className="text-xs text-zinc-500 leading-relaxed">
              No active artifacts indexed. Archived evidence is preserved under Settings &gt;
              Runtime data.
            </p>
          </div>
        ) : (
          artifacts.map((artifact) => (
            <button
              key={artifact.id}
              className="flex flex-col items-start text-left p-3 rounded-lg border border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 transition-colors"
              onClick={onOpenSession}
            >
              <strong className="text-sm text-zinc-200 truncate w-full">{artifact.label}</strong>
              <span className="text-xs text-zinc-500 font-mono mt-1 truncate w-full">
                {artifact.path}
              </span>
              <Badge tone="slate">
                <span className="mt-2 text-[10px]">{artifact.kind}</span>
              </Badge>
            </button>
          ))
        )}
      </div>

      <button
        className="mt-auto w-full rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
        onClick={onOpenSession}
      >
        Open Artifact Store
      </button>
    </article>
  );
}
