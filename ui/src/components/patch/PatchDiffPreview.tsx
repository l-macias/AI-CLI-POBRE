import { FileDiff } from 'lucide-react';
import { Badge } from '../Badge';
import type { RuntimePatchDiffFile, RuntimePatchDiffGenerateResult } from '../../types/runtime';

interface PatchDiffPreviewProps {
  result: RuntimePatchDiffGenerateResult;
}

export function PatchDiffPreview({ result }: PatchDiffPreviewProps) {
  return (
    <article className="plan-summary-card">
      <div className="panel-title-row">
        <FileDiff size={18} />
        <div>
          <strong>Diff preview</strong>
          <p className="muted">Preview only. No file was applied or written to the project.</p>
        </div>
      </div>

      <div className="plan-step-badges">
        <Badge tone="blue">{result.diff.summary.filesChanged} files</Badge>
        <Badge tone="green">+{result.diff.summary.additions}</Badge>
        <Badge tone="red">-{result.diff.summary.deletions}</Badge>
        <Badge tone={result.diff.safeToPreview ? 'green' : 'red'}>
          {result.diff.safeToPreview ? 'safe preview' : 'blocked'}
        </Badge>
      </div>

      <div className="plan-step-list">
        {result.diff.files.map((file) => (
          <DiffFileCard file={file} key={file.path} />
        ))}
      </div>
    </article>
  );
}

function DiffFileCard({ file }: { file: RuntimePatchDiffFile }) {
  return (
    <article className="plan-step-card">
      <div className="plan-step-content">
        <div className="plan-step-header">
          <strong>{file.path}</strong>
          <div className="plan-step-badges">
            <Badge tone={toneForStatus(file.status)}>{file.status}</Badge>
            <Badge tone="green">+{file.additions}</Badge>
            <Badge tone="red">-{file.deletions}</Badge>
          </div>
        </div>

        <details>
          <summary>View line preview</summary>
          <pre className="code-preview">
            {file.lines.map((line) => formatDiffLine(line)).join('\n')}
          </pre>
        </details>
      </div>
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
