import { useMemo } from 'react';
import type { InteractiveSessionState } from '../../types/runtime';
import { Badge } from '../Badge';
import { ContextFileCard, type ContextFileItem } from './ContextFileCard';
import { RelatedFilesGraph } from './RelatedFilesGraph';

interface ContextViewerProps {
  session: InteractiveSessionState | null;
}

export function ContextViewer({ session }: ContextViewerProps) {
  const files = useMemo(() => buildContextFiles(session), [session]);

  const blockedCount = files.filter(
    (file) => file.status === 'blocked' || file.status === 'protected',
  ).length;

  return (
    <section className="context-viewer">
      <div className="panel-header">
        <div>
          <h2>Context Viewer</h2>
          <p className="muted">Files selected, related, blocked and protected by runtime policy.</p>
        </div>

        <div className="context-summary-badges">
          <Badge tone="blue">{files.length} files</Badge>
          <Badge tone={blockedCount > 0 ? 'red' : 'green'}>{blockedCount} blocked</Badge>
        </div>
      </div>

      <RelatedFilesGraph files={files} />

      <div className="context-file-list">
        {files.length > 0 ? (
          files.map((file) => <ContextFileCard file={file} key={file.path} />)
        ) : (
          <p className="muted">No context collected yet. Send /context or start a planning flow.</p>
        )}
      </div>
    </section>
  );
}

function buildContextFiles(session: InteractiveSessionState | null): ContextFileItem[] {
  if (!session) {
    return [];
  }

  const files = new Map<string, ContextFileItem>();

  files.set('project-root', {
    path: session.projectRoot,
    reason: 'entry project root',
    status: 'selected',
    risk: 'low',
  });

  for (const action of session.runtimeActions) {
    const text = `${action.title} ${action.description}`.toLowerCase();

    if (text.includes('files') || text.includes('context')) {
      files.set(`runtime-action:${action.id}`, {
        path: action.title,
        reason: 'runtime related action',
        status: 'related',
        risk: action.status === 'failed' || action.status === 'blocked' ? 'medium' : 'low',
      });
    }

    if (text.includes('protected') || text.includes('blocked')) {
      files.set(`protected:${action.id}`, {
        path: action.title,
        reason: 'protected or blocked',
        status: 'protected',
        risk: 'high',
      });
    }
  }

  files.set('.env', {
    path: '.env',
    reason: 'protected path',
    status: 'protected',
    risk: 'high',
  });

  files.set('node_modules', {
    path: 'node_modules',
    reason: 'blocked generated/dependency path',
    status: 'blocked',
    risk: 'medium',
  });

  return [...files.values()];
}
