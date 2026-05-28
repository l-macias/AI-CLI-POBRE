import { FileDiff } from 'lucide-react';
import { Badge } from '../Badge';
import type { RuntimePatchDiffFile, RuntimePatchDiffGenerateResult } from '../../types/runtime';

interface PatchDiffPreviewProps {
  result: RuntimePatchDiffGenerateResult;
}

export function PatchDiffPreview({ result }: PatchDiffPreviewProps) {
  return (
    <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm">
      <div className="flex items-start gap-3 border-b border-zinc-800/60 pb-4">
        <FileDiff size={18} className="text-indigo-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <strong className="block text-base font-medium text-zinc-100">Diff preview</strong>
          <p className="text-sm text-zinc-400 mt-1">
            Preview only. No file was applied or written to the project.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">{result.diff.summary.filesChanged} files</Badge>
        <Badge tone="green">+{result.diff.summary.additions}</Badge>
        <Badge tone="red">-{result.diff.summary.deletions}</Badge>
        <Badge tone={result.diff.safeToPreview ? 'green' : 'red'}>
          {result.diff.safeToPreview ? 'safe preview' : 'blocked'}
        </Badge>
      </div>

      <div className="flex flex-col gap-3">
        {result.diff.files.map((file) => (
          <DiffFileCard file={file} key={file.path} />
        ))}
      </div>
    </article>
  );
}

function DiffFileCard({ file }: { file: RuntimePatchDiffFile }) {
  return (
    <article className="flex flex-col gap-3 p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700/80 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <strong className="text-sm font-mono text-zinc-200 truncate">{file.path}</strong>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Badge tone={toneForStatus(file.status)}>{file.status}</Badge>
          <Badge tone="green">+{file.additions}</Badge>
          <Badge tone="red">-{file.deletions}</Badge>
        </div>
      </div>

      <details className="group [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors select-none">
          View line preview
        </summary>
        <pre className="mt-3 p-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent leading-relaxed whitespace-pre-wrap">
          {file.lines.map((line) => formatDiffLine(line)).join('\n')}
        </pre>
      </details>
    </article>
  );
}

function formatDiffLine(line: RuntimePatchDiffFile['lines'][number]): string {
  if (line.type === 'added') {
    return `+ ${line.content}`;
  }

  if (line.type === 'removed') {
    return `- ${line.content}`;
  }

  return `  ${line.content}`;
}

function toneForStatus(status: RuntimePatchDiffFile['status']) {
  if (status === 'added') {
    return 'green';
  }

  if (status === 'deleted') {
    return 'red';
  }

  if (status === 'modified') {
    return 'yellow';
  }

  return 'slate';
}
