import { GitCompare } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { InteractiveSessionState } from '../../types/runtime';
import { Badge } from '../Badge';
import { DiffLine } from './DiffLine';
import type { DiffFileViewModel, PatchDiffViewModel } from './DiffTypes';
import { FileDiffTabs } from './FileDiffTabs';
import { PatchSummary } from './PatchSummary';

interface PatchDiffViewerProps {
  session: InteractiveSessionState | null;
  onCommand: (command: string) => void;
}

export function PatchDiffViewer({ session, onCommand }: PatchDiffViewerProps) {
  const patch = useMemo(() => buildPatchDiff(session), [session]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const activeFile = resolveActiveFile({
    files: patch?.files ?? [],
    activeFileId,
  });

  if (!patch) {
    return (
      <section className="patch-diff-viewer">
        <div className="panel-header">
          <div className="panel-title-row">
            <GitCompare size={18} />
            <div>
              <h2>Patch Diff</h2>
              <p className="muted">No patch proposal has been recorded yet.</p>
            </div>
          </div>

          <Badge tone="slate">empty</Badge>
        </div>

        <div className="empty-plan-state">
          <strong>No diff available.</strong>
          <p className="muted">
            Send <code>/diff</code> or <code>/apply</code> to record patch intent.
          </p>
          <button disabled={!session} onClick={() => onCommand('/diff')}>
            Request diff
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="patch-diff-viewer">
      <div className="panel-header">
        <div className="panel-title-row">
          <GitCompare size={18} />
          <div>
            <h2>Patch Diff</h2>
            <p className="muted">Review file-level changes before approval.</p>
          </div>
        </div>

        <Badge tone="yellow">preview</Badge>
      </div>

      <PatchSummary patch={patch} />

      <FileDiffTabs
        files={patch.files}
        activeFileId={activeFile?.id ?? null}
        onSelectFile={setActiveFileId}
      />

      {activeFile ? (
        <article className="diff-file-panel">
          <div className="diff-file-header">
            <div>
              <strong>{activeFile.path}</strong>
              <p className="muted">
                {activeFile.status} · +{activeFile.additions} -{activeFile.removals}
              </p>
            </div>

            <Badge
              tone={
                activeFile.riskLevel === 'high'
                  ? 'red'
                  : activeFile.riskLevel === 'medium'
                    ? 'yellow'
                    : 'green'
              }
            >
              {activeFile.riskLevel} risk
            </Badge>
          </div>

          <div className="diff-code">
            {activeFile.lines.map((line) => (
              <DiffLine line={line} key={line.id} />
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}

function resolveActiveFile(input: {
  files: DiffFileViewModel[];
  activeFileId: string | null;
}): DiffFileViewModel | null {
  if (input.files.length === 0) {
    return null;
  }

  if (!input.activeFileId) {
    return input.files[0] ?? null;
  }

  return input.files.find((file) => file.id === input.activeFileId) ?? input.files[0] ?? null;
}

function buildPatchDiff(session: InteractiveSessionState | null): PatchDiffViewModel | null {
  if (!session) {
    return null;
  }

  const patchActions = session.runtimeActions.filter((action) => {
    const text = `${action.title} ${action.description}`.toLowerCase();

    return (
      text.includes('diff') ||
      text.includes('patch') ||
      text.includes('apply') ||
      text.includes('revision')
    );
  });

  if (patchActions.length === 0) {
    return null;
  }

  return {
    id: `patch-preview-${session.id}`,
    title: 'Runtime patch preview',
    summary:
      'Synthetic diff preview generated from recorded runtime actions. Real patch operations will be connected in a later backend session.',
    files: patchActions.map((action, index): DiffFileViewModel => {
      const status = inferFileStatus(action.title, action.description);
      const riskLevel = inferRiskLevel(action.title, action.description);

      return {
        id: `diff-file-${action.id}`,
        path: inferPath(action.title, index),
        status,
        riskLevel,
        additions: status === 'deleted' ? 0 : 8 + index,
        removals: status === 'created' ? 0 : 3 + index,
        lines: buildSyntheticLines(action.title, action.description, status),
      };
    }),
  };
}

function inferFileStatus(title: string, description: string): DiffFileViewModel['status'] {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('delete') || text.includes('remove')) {
    return 'deleted';
  }

  if (text.includes('create') || text.includes('new')) {
    return 'created';
  }

  return 'modified';
}

function inferRiskLevel(title: string, description: string): DiffFileViewModel['riskLevel'] {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('auth') || text.includes('delete') || text.includes('database')) {
    return 'high';
  }

  if (text.includes('apply') || text.includes('patch') || text.includes('protected')) {
    return 'medium';
  }

  return 'low';
}

function inferPath(title: string, index: number): string {
  const normalized = title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');

  return `src/generated/${String(index + 1).padStart(2, '0')}-${normalized || 'runtime-change'}.ts`;
}

function buildSyntheticLines(
  title: string,
  description: string,
  status: DiffFileViewModel['status'],
): DiffFileViewModel['lines'] {
  if (status === 'created') {
    return [
      {
        id: 'created-1',
        type: 'added',
        newLineNumber: 1,
        content: `// ${title}`,
      },
      {
        id: 'created-2',
        type: 'added',
        newLineNumber: 2,
        content: `export const runtimeChange = ${JSON.stringify(description)};`,
      },
    ];
  }

  if (status === 'deleted') {
    return [
      {
        id: 'deleted-1',
        type: 'removed',
        oldLineNumber: 1,
        content: `// Removed by runtime proposal: ${title}`,
      },
      {
        id: 'deleted-2',
        type: 'removed',
        oldLineNumber: 2,
        content: description,
      },
    ];
  }

  return [
    {
      id: 'context-1',
      type: 'context',
      oldLineNumber: 1,
      newLineNumber: 1,
      content: `// Existing runtime-controlled file`,
    },
    {
      id: 'removed-1',
      type: 'removed',
      oldLineNumber: 2,
      content: `const previous = ${JSON.stringify(title)};`,
    },
    {
      id: 'added-1',
      type: 'added',
      newLineNumber: 2,
      content: `const proposed = ${JSON.stringify(description)};`,
    },
  ];
}
