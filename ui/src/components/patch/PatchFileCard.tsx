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
          <strong>Summary</strong>
          <ul className="compact-list">
            {file.changesSummary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <strong>Reason</strong>
          <p>{file.reason}</p>
        </div>

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

function toneForRisk(risk: RuntimePatchFileChange['riskLevel']) {
  if (risk === 'high') {
    return 'red';
  }

  if (risk === 'medium') {
    return 'yellow';
  }

  return 'green';
}
