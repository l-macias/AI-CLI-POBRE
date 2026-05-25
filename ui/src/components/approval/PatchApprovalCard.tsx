import { CheckCircle2, FileCheck2, RotateCcw, XCircle } from 'lucide-react';
import { Badge } from '../Badge';
import type { ApprovalDecisionViewInput, ApprovalRequest } from './ApprovalTypes';
import { ApprovalChecklist } from './ApprovalChecklist';

interface PatchApprovalCardProps {
  request: ApprovalRequest;
  selectedFilePaths: string[];
  onToggleFile: (filePath: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDecision: (input: ApprovalDecisionViewInput) => void;
}

export function PatchApprovalCard({
  request,
  selectedFilePaths,
  onToggleFile,
  onSelectAll,
  onClearSelection,
  onDecision,
}: PatchApprovalCardProps) {
  const approveAction = request.actions.find((action) => action.kind === 'approve');
  const approveSelectedAction = request.actions.find(
    (action) => action.kind === 'approve_selected_files',
  );
  const rejectAction = request.actions.find((action) => action.kind === 'reject');
  const askRevisionAction = request.actions.find((action) => action.kind === 'ask_revision');

  const selectedCount = selectedFilePaths.length;
  const selectableCount = request.fileReviews.filter((file) => file.userSelectable).length;

  return (
    <article className="approval-request-card patch-approval-card">
      <div className="panel-header">
        <div>
          <h3>{request.title}</h3>
          <p className="muted">{request.description}</p>
        </div>

        <div className="approval-risk-badges">
          <Badge tone={toneForRisk(request.riskLevel)}>{request.riskLevel} risk</Badge>
          <Badge tone="blue">{request.kind}</Badge>
          <Badge tone={request.status === 'pending' ? 'yellow' : 'green'}>{request.status}</Badge>
          <Badge tone={selectedCount > 0 ? 'green' : 'yellow'}>
            {selectedCount}/{selectableCount} selected
          </Badge>
        </div>
      </div>

      <ApprovalChecklist items={request.checklist} />

      <section className="approval-file-review-list">
        <div className="approval-file-review-header">
          <div>
            <strong>File-level review</strong>
            <p className="muted">
              Approve all files or only selected files. High-risk files start unselected.
            </p>
          </div>

          <div className="approval-file-review-actions">
            <button className="secondary-button" type="button" onClick={onSelectAll}>
              Select all
            </button>
            <button className="secondary-button" type="button" onClick={onClearSelection}>
              Clear
            </button>
          </div>
        </div>

        {request.fileReviews.map((file) => {
          const checked = selectedFilePaths.includes(file.path);

          return (
            <label className="approval-file-review-card" key={file.path}>
              <input
                type="checkbox"
                checked={checked}
                disabled={!file.userSelectable}
                onChange={() => onToggleFile(file.path)}
              />

              <div className="approval-file-review-content">
                <div className="approval-file-review-title">
                  <strong>{file.path}</strong>
                  <div className="plan-step-badges">
                    <Badge tone={toneForOperation(file.operation)}>{file.operation}</Badge>
                    <Badge tone={toneForRisk(file.riskLevel)}>risk: {file.riskLevel}</Badge>
                    <Badge tone={file.userSelectable ? 'green' : 'red'}>
                      {file.userSelectable ? 'selectable' : 'locked'}
                    </Badge>
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
              </div>
            </label>
          );
        })}
      </section>

      <div className="approval-actions-grid">
        <button
          disabled={!approveAction?.enabled}
          title={approveAction?.blockedReason}
          onClick={() =>
            onDecision({
              requestId: request.id,
              action: 'approve',
              selectedFilePaths: request.filePaths,
            })
          }
        >
          <CheckCircle2 size={16} />
          Approve all
        </button>

        <button
          disabled={!approveSelectedAction?.enabled || selectedFilePaths.length === 0}
          className="secondary-button"
          title={
            selectedFilePaths.length === 0
              ? 'Select at least one file.'
              : approveSelectedAction?.blockedReason
          }
          onClick={() =>
            onDecision({
              requestId: request.id,
              action: 'approve_selected_files',
              selectedFilePaths,
            })
          }
        >
          <FileCheck2 size={16} />
          Approve selected
        </button>

        <button
          disabled={!askRevisionAction?.enabled}
          className="secondary-button"
          title={askRevisionAction?.blockedReason}
          onClick={() =>
            onDecision({
              requestId: request.id,
              action: 'ask_revision',
              selectedFilePaths: [],
            })
          }
        >
          <RotateCcw size={16} />
          Ask revision
        </button>

        <button
          disabled={!rejectAction?.enabled}
          className="danger-button"
          title={rejectAction?.blockedReason}
          onClick={() =>
            onDecision({
              requestId: request.id,
              action: 'reject',
              selectedFilePaths: [],
            })
          }
        >
          <XCircle size={16} />
          Reject
        </button>
      </div>
    </article>
  );
}

function toneForOperation(operation: ApprovalRequest['fileReviews'][number]['operation']) {
  if (operation === 'delete') {
    return 'red';
  }

  if (operation === 'create') {
    return 'yellow';
  }

  return 'blue';
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
