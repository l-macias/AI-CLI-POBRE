import { Badge } from '../Badge';
import type { ProjectKnownFileMemory, ProjectMemoryEntry } from './MemoryTypes';

type MemoryFactCardProps =
  | {
      entry: ProjectMemoryEntry;
      variant: 'entry';
    }
  | {
      entry: ProjectKnownFileMemory;
      variant: 'known-file';
    };

export function MemoryFactCard({ entry, variant }: MemoryFactCardProps) {
  const title = variant === 'entry' ? entry.title : entry.path;
  const content = variant === 'entry' ? entry.content : entry.summary;

  return (
    <article className="flex flex-col gap-3 p-4 rounded-xl border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700/80 transition-colors shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <strong
          className={`text-sm font-semibold break-all ${variant === 'known-file' ? 'font-mono text-indigo-300' : 'text-zinc-200'}`}
        >
          {title}
        </strong>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Badge tone={toneForImportance(entry.importance)}>{entry.importance}</Badge>
          <Badge tone={entry.trustLevel === 'quarantined' ? 'red' : 'blue'}>
            {entry.trustLevel}
          </Badge>
        </div>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">{content}</p>

      <div className="flex flex-wrap gap-2 mt-1 pt-3 border-t border-zinc-800/60">
        {entry.tags.length === 0 ? (
          <span className="text-xs text-zinc-500 italic">No tags</span>
        ) : (
          entry.tags.map((tag) => (
            <Badge key={tag} tone="slate" className="text-[10px]">
              {tag}
            </Badge>
          ))
        )}
      </div>
    </article>
  );
}

function toneForImportance(importance: ProjectMemoryEntry['importance']) {
  if (importance === 'critical') {
    return 'red';
  }

  if (importance === 'high') {
    return 'yellow';
  }

  if (importance === 'medium') {
    return 'blue';
  }

  return 'slate';
}
