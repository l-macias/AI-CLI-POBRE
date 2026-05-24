import { Sparkles } from 'lucide-react';
import { Badge } from '../Badge';
import type { NextWorkflowAction } from './WorkflowTypes';

interface NextBestActionPanelProps {
  action: NextWorkflowAction;
}

export function NextBestActionPanel({ action }: NextBestActionPanelProps) {
  return (
    <article className="next-best-action-panel">
      <div className="panel-title-row">
        <Sparkles size={18} />
        <div>
          <strong>{action.title}</strong>
          <p className="muted">{action.description}</p>
        </div>
      </div>

      {action.blockedReason ? (
        <div className="workflow-blocked-reason">
          <Badge tone="red">blocked</Badge>
          <span>{action.blockedReason}</span>
        </div>
      ) : null}

      <div className="workflow-action-buttons">
        <button disabled={action.disabled} onClick={action.onRun}>
          {action.buttonLabel}
        </button>

        {action.secondaryButtonLabel && action.onRunSecondary ? (
          <button
            className="secondary-button"
            disabled={action.disabled}
            onClick={action.onRunSecondary}
          >
            {action.secondaryButtonLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}
