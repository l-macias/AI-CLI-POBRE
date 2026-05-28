import { FilePlus2, FileText, Trash2 } from 'lucide-react';
import { Badge } from '../Badge';
import type { DiffFileViewModel } from './DiffTypes';

interface FileDiffTabsProps {
  files: DiffFileViewModel[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
}

export function FileDiffTabs({ files, activeFileId, onSelectFile }: FileDiffTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-800/60 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
      {files.map((file) => {
        const isActive = file.id === activeFileId;
        return (
          <button
            key={file.id}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none ${
              isActive
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
            onClick={() => onSelectFile(file.id)}
          >
            <StatusIcon status={file.status} />
            <span className="font-mono text-xs">{file.path}</span>
            <Badge tone={toneForStatus(file.status)}>{file.status}</Badge>
          </button>
        );
      })}
    </div>
  );
}

function StatusIcon({ status }: { status: DiffFileViewModel['status'] }) {
  if (status === 'created') {
    return <FilePlus2 size={16} className="text-emerald-400" />;
  }

  if (status === 'deleted') {
    return <Trash2 size={16} className="text-red-400" />;
  }

  return <FileText size={16} className="text-zinc-400" />;
}

function toneForStatus(
  status: DiffFileViewModel['status'],
): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
  if (status === 'created') {
    return 'green';
  }

  if (status === 'deleted') {
    return 'red';
  }

  return 'yellow';
}
