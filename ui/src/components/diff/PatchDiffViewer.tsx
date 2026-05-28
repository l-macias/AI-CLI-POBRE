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
      <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm h-full">
        <div className="flex justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-5">
          <div className="flex items-start gap-3">
            <GitCompare size={20} className="text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Patch Diff</h2>
              <p className="text-sm text-zinc-400 mt-1">No patch proposal has been recorded yet.</p>
            </div>
          </div>

          <Badge tone="slate">empty</Badge>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 flex-1 min-h-[300px]">
          <GitCompare size={24} className="text-zinc-600" />
          <div>
            <strong className="block text-sm font-medium text-zinc-300">No diff available.</strong>
            <p className="text-xs text-zinc-500 mt-1">
              Send <code className="bg-zinc-800 px-1 py-0.5 rounded">/diff</code> or{' '}
              <code className="bg-zinc-800 px-1 py-0.5 rounded">/apply</code> to record patch
              intent.
            </p>
          </div>
          <button
            className="mt-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
            disabled={!session}
            onClick={() => onCommand('/diff')}
          >
            Request diff
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/60 pb-5 mb-5">
        <div className="flex items-start gap-3">
          <GitCompare size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Patch Diff</h2>
            <p className="text-sm text-zinc-400 mt-1">Review file-level changes before approval.</p>
          </div>
        </div>

        <Badge tone="yellow" className="shrink-0">
          preview
        </Badge>
      </div>

      <PatchSummary patch={patch} />

      <FileDiffTabs
        files={patch.files}
        activeFileId={activeFile?.id ?? null}
        onSelectFile={setActiveFileId}
      />

      {activeFile ? (
        <article className="flex flex-col rounded-b-xl border border-t-0 border-zinc-800/60 bg-[#0d1117] overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-zinc-800/60 bg-zinc-900/80">
            <div>
              <strong className="block text-sm font-mono text-zinc-200 truncate">
                {activeFile.path}
              </strong>
              <p className="text-xs text-zinc-400 mt-1">
                {activeFile.status} ·{' '}
                <span className="text-emerald-400">+{activeFile.additions}</span>{' '}
                <span className="text-red-400">-{activeFile.removals}</span>
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

          <div className="overflow-x-auto py-2 h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
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
