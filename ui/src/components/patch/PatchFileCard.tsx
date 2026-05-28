import { FilePenLine } from 'lucide-react';
import { Badge } from '../Badge';
import type { RuntimePatchFileChange } from '../../types/runtime';

interface PatchFileCardProps {
  file: RuntimePatchFileChange;
}

export function PatchFileCard({ file }: PatchFileCardProps) {
  return (
    <article className="flex items-start gap-4 p-5 rounded-xl border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700/80 transition-colors shadow-sm">
      <div className="mt-0.5 shrink-0 text-zinc-500">
        <FilePenLine size={18} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 border-b border-zinc-800/60 pb-3">
          <strong className="text-sm font-mono text-zinc-200 truncate">{file.path}</strong>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Badge tone={toneForOperation(file.operation)}>{file.operation}</Badge>
            <Badge tone={toneForRisk(file.riskLevel)}>risk: {file.riskLevel}</Badge>
            <Badge tone={file.userSelectable ? 'green' : 'red'}>
              {file.userSelectable ? 'selectable' : 'locked'}
            </Badge>
            {file.beforeHash ? (
              <Badge tone="slate">hash: {file.beforeHash.slice(0, 8)}</Badge>
            ) : null}
          </div>
        </div>

        <div>
          <strong className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Summary
          </strong>
          <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1.5">
            {file.changesSummary.map((item) => (
              <li key={item} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <strong className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
            Reason
          </strong>
          <p className="text-sm text-zinc-300 leading-relaxed">{file.reason}</p>
        </div>

        {file.content ? (
          <details className="group [&_summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors select-none">
              Preview proposed content
            </summary>
            <pre className="mt-3 p-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent leading-relaxed whitespace-pre-wrap break-all">
              {file.content}
            </pre>
          </details>
        ) : null}
      </div>
    </article>
  );
}

function toneForOperation(operation: RuntimePatchFileChange['operation']) {
  if (operation === 'delete') {
    return 'red';
  }

  if (operation === 'create') {
    return 'yellow';
  }

  return 'blue';
}

function toneForRisk(risk: RuntimePatchFileChange['riskLevel']) {
  if (risk === 'high') {
    return 'red';
  }

  if (risk === 'medium') {
    return 'yellow';
  }

  return 'green';
}
