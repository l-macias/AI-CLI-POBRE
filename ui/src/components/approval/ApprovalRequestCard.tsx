import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '../Badge';
import type { ApprovalDecisionViewInput, ApprovalRequest } from './ApprovalTypes';
import { ApprovalChecklist } from './ApprovalChecklist';

interface ApprovalRequestCardProps {
  request: ApprovalRequest;
  selectedFilePaths: string[];
  onToggleFile: (filePath: string) => void;
  onDecision: (input: ApprovalDecisionViewInput) => void;
}

export function ApprovalRequestCard({
  request,
  selectedFilePaths,
  onToggleFile,
  onDecision,
}: ApprovalRequestCardProps) {
  return (
    <article className="approval-request-card">
      <div className="panel-header">
        <div>
          <h3>{request.title}</h3>
          <p className="muted">{request.description}</p>
        </div>

        <div className="approval-risk-badges">
          <Badge tone={toneForRisk(request.riskLevel)}>{request.riskLevel} risk</Badge>
          <Badge tone="blue">{request.kind}</Badge>
          <Badge tone={request.status === 'pending' ? 'yellow' : 'green'}>{request.status}</Badge>
        </div>
      </div>

      <ApprovalChecklist items={request.checklist} />

      {request.filePaths.length > 0 ? (
        <section className="approval-file-list">
          <strong>Files</strong>

          {request.filePaths.map((filePath) => (
            <label className="approval-file-row" key={filePath}>
              <input
                type="checkbox"
                checked={selectedFilePaths.includes(filePath)}
                onChange={() => onToggleFile(filePath)}
              />
              <span>{filePath}</span>
            </label>
          ))}
        </section>
      ) : null}

      <div className="approval-actions-grid">
        {request.actions.map((action) => (
          <button
            key={action.kind}
            disabled={!action.enabled}
            className={action.kind === 'reject' ? 'danger-button' : 'secondary-button'}
            title={action.blockedReason}
            onClick={() =>
              onDecision({
                requestId: request.id,
                action: action.kind,
                selectedFilePaths:
                  action.kind === 'approve_selected_files' ? selectedFilePaths : request.filePaths,
              })
            }
          >
            {iconForAction(action.kind)}
            {action.label}
          </button>
        ))}
      </div>
    </article>
  );
}

function toneForRisk(riskLevel: ApprovalRequest['riskLevel']) {
  if (riskLevel === 'high') {
    return 'red';
  }

  if (riskLevel === 'medium') {
    return 'yellow';
  }

  return 'green';
}

function iconForAction(action: ApprovalRequest['actions'][number]['kind']) {
  if (action === 'approve' || action === 'approve_selected_files') {
    return <CheckCircle2 size={16} />;
  }

  if (action === 'reject') {
    return <XCircle size={16} />;
  }

  return <AlertTriangle size={16} />;
}
