import type { ContextFileItem } from './ContextFileCard';

interface RelatedFilesGraphProps {
  files: ContextFileItem[];
}

export function RelatedFilesGraph({ files }: RelatedFilesGraphProps) {
  const selectedFiles = files.filter((file) => file.status === 'selected');
  const relatedFiles = files.filter((file) => file.status === 'related');

  return (
    <section className="flex items-center gap-6 p-6 rounded-xl border border-zinc-800/60 bg-zinc-950/30 overflow-x-auto shadow-inner">
      <div className="flex flex-col gap-3 min-w-[240px]">
        <strong className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
          Selected
        </strong>
        {selectedFiles.length > 0 ? (
          selectedFiles.map((file) => (
            <div
              className="px-3 py-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-sm font-mono text-indigo-300 truncate"
              key={file.path}
            >
              {file.path}
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-500 italic">No selected files yet.</p>
        )}
      </div>

      <div className="flex-1 h-px bg-zinc-700 min-w-[40px] relative shrink-0">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-zinc-600"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-zinc-600"></div>
      </div>

      <div className="flex flex-col gap-3 min-w-[240px]">
        <strong className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Related
        </strong>
        {relatedFiles.length > 0 ? (
          relatedFiles.map((file) => (
            <div
              className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 text-sm font-mono text-zinc-300 truncate"
              key={file.path}
            >
              {file.path}
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-500 italic">No related files yet.</p>
        )}
      </div>
    </section>
  );
}
