import { FilePenLine } from 'lucide-react';
import { Badge } from '../Badge';
import type { RuntimePatchFileChange } from '../../types/runtime';

interface PatchFileCardProps {
  file: RuntimePatchFileChange;
}

export function PatchFileCard({ file }: PatchFileCardProps) {
  return (
    <article className="plan-step-card">
      <div className="plan-step-icon">
        <FilePenLine size={18} />
      </div>

      <div className="plan-step-content">
        <div className="plan-step-header">
          <strong>{file.path}</strong>
          <div className="plan-step-badges">
            <Badge tone={toneForOperation(file.operation)}>{file.operation}</Badge>
            {file.beforeHash ? (
              <Badge tone="slate">hash: {file.beforeHash.slice(0, 8)}</Badge>
            ) : null}
          </div>
        </div>

        <p>{file.reason}</p>

        {file.content ? (
          <details>
            <summary>Preview proposed content</summary>
            <pre className="code-preview">{file.content}</pre>
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
