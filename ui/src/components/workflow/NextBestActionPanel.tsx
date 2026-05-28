import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { Badge } from '../Badge';
import type { NextWorkflowAction } from './WorkflowTypes';

interface NextBestActionPanelProps {
  action: NextWorkflowAction;
}

export function NextBestActionPanel({ action }: NextBestActionPanelProps) {
  const isBlocked = Boolean(action.blockedReason);
  const isReady = !action.disabled && !isBlocked;

  return (
    <article
      className={
        isBlocked
          ? 'next-best-action-panel next-best-action-panel-friendly blocked'
          : 'next-best-action-panel next-best-action-panel-friendly'
      }
    >
      <div className="next-action-main">
        <div className="next-action-kicker">
          {isBlocked ? <LockKeyhole size={16} /> : <Sparkles size={16} />}
          <span>Next safe step</span>
          <Badge tone={isBlocked ? 'red' : isReady ? 'green' : 'slate'}>
            {isBlocked ? 'blocked' : isReady ? 'ready' : 'waiting'}
          </Badge>
        </div>

        <h3>{action.title}</h3>
        <p>{action.description}</p>

        {action.blockedReason ? (
          <div className="workflow-blocked-reason">
            <Badge tone="red">why blocked</Badge>
            <span>{action.blockedReason}</span>
          </div>
        ) : (
          <div className="workflow-ready-reason">
            <Badge tone="green">safe to continue</Badge>
            <span>This is the recommended action for the current runtime state.</span>
          </div>
        )}
      </div>

      <div className="workflow-action-buttons next-action-buttons">
        <button
          className="primary-workflow-action"
          disabled={action.disabled}
          onClick={action.onRun}
        >
          {action.buttonLabel}
          {!action.disabled ? <ArrowRight size={18} /> : null}
        </button>

        {action.secondaryButtonLabel && action.onRunSecondary ? (
          <button
            className="secondary-button secondary-workflow-action"
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
