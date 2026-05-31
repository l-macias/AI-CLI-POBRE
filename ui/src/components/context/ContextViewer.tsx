import { useMemo } from 'react';
import type { InteractiveSessionState } from '../../types/runtime';
import { Badge } from '../Badge';
import { ContextFileCard, type ContextFileItem } from './ContextFileCard';
import { RelatedFilesGraph } from './RelatedFilesGraph';

interface ContextViewerProps {
  session: InteractiveSessionState | null;
  readOnly?: boolean;
}

export function ContextViewer({ session, readOnly = false }: ContextViewerProps) {
  const files = useMemo(() => buildContextFiles(session), [session]);

  const blockedCount = files.filter(
    (file) => file.status === 'blocked' || file.status === 'protected',
  ).length;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100 tracking-tight">
            {readOnly ? 'Context files' : 'Runtime context files'}
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            {readOnly
              ? 'Files selected for read-only analysis. They are not candidates for patch apply.'
              : 'Files selected, related, blocked and protected by runtime policy.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone={files.length > 0 ? 'blue' : 'slate'}>{files.length} files</Badge>
          <Badge tone={blockedCount > 0 ? 'red' : 'green'}>{blockedCount} blocked</Badge>
          {readOnly ? <Badge tone="green">read-only</Badge> : null}
        </div>
      </div>

      {files.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-6">
          <div className="flex flex-col gap-3">
            {files.map((file) => (
              <ContextFileCard key={`${file.path}-${file.status}-${file.reason}`} file={file} />
            ))}
          </div>

          <RelatedFilesGraph files={files} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No context files available yet.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Prepare workflow or generate a plan to populate runtime context.
          </p>
        </div>
      )}
    </section>
  );
}

function buildContextFiles(session: InteractiveSessionState | null): ContextFileItem[] {
  if (!session) {
    return [];
  }

  const files: ContextFileItem[] = [
    {
      path: session.projectRoot,
      reason: 'session root',
      status: 'selected',
      risk: 'low',
    },
  ];

  for (const action of session.runtimeActions) {
    const text = `${action.title} ${action.description}`;
    const matches = text.matchAll(
      /(?:src|ui|app|pages|components|lib|server|api|routes|controllers)\/[^\s'",)]+/g,
    );

    for (const match of matches) {
      const path = match[0].replace(/[.,;:]+$/, '');

      files.push({
        path,
        reason: 'runtime action',
        status: action.status === 'blocked' ? 'blocked' : 'related',
        risk: inferRiskFromText(text),
      });
    }
  }

  return dedupeContextFiles(files);
}

function inferRiskFromText(text: string): ContextFileItem['risk'] {
  const normalized = text.toLowerCase();

  if (
    normalized.includes('database') ||
    normalized.includes('prisma') ||
    normalized.includes('auth') ||
    normalized.includes('delete') ||
    normalized.includes('apply')
  ) {
    return 'high';
  }

  if (
    normalized.includes('patch') ||
    normalized.includes('risk') ||
    normalized.includes('protected')
  ) {
    return 'medium';
  }

  return 'low';
}

function dedupeContextFiles(files: ContextFileItem[]): ContextFileItem[] {
  const seen = new Set<string>();
  const result: ContextFileItem[] = [];

  for (const file of files) {
    const key = file.path.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(file);
  }

  return result;
}
