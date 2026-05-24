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
    <article className="memory-card">
      <div className="memory-card-header">
        <strong>{title}</strong>

        <div className="memory-badge-row">
          <Badge tone={toneForImportance(entry.importance)}>{entry.importance}</Badge>
          <Badge tone={entry.trustLevel === 'quarantined' ? 'red' : 'blue'}>
            {entry.trustLevel}
          </Badge>
        </div>
      </div>

      <p>{content}</p>

      <div className="memory-tags">
        {entry.tags.length === 0 ? (
          <span className="muted">No tags</span>
        ) : (
          entry.tags.map((tag) => (
            <Badge key={tag} tone="slate">
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
