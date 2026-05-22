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
    <div className="file-diff-tabs">
      {files.map((file) => (
        <button
          className={file.id === activeFileId ? 'file-diff-tab active' : 'file-diff-tab'}
          key={file.id}
          onClick={() => onSelectFile(file.id)}
        >
          <StatusIcon status={file.status} />

          <span>{file.path}</span>

          <Badge tone={toneForStatus(file.status)}>{file.status}</Badge>
        </button>
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: DiffFileViewModel['status'] }) {
  if (status === 'created') {
    return <FilePlus2 size={16} />;
  }

  if (status === 'deleted') {
    return <Trash2 size={16} />;
  }

  return <FileText size={16} />;
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
