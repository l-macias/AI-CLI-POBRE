import { useEffect, useState } from 'react';
import { Badge } from '../Badge';
import type { ApprovalCenterResult } from './ApprovalTypes';
import type { ApprovalDecisionViewInput, ApprovalRequest } from './ApprovalTypes';
import { ApprovalRequestCard } from './ApprovalRequestCard';
import { PatchApprovalCard } from './PatchApprovalCard';
import { RiskApprovalCard } from './RiskApprovalCard';
import { VerifyApprovalCard } from './VerifyApprovalCard';

interface ApprovalCenterProps {
  center: ApprovalCenterResult | null;
  loading?: boolean;
  onDecision: (input: ApprovalDecisionViewInput) => void;
}

export function ApprovalCenter({ center, loading = false, onDecision }: ApprovalCenterProps) {
  const [selectedFilesByRequest, setSelectedFilesByRequest] = useState<Record<string, string[]>>(
    {},
  );

  useEffect(() => {
    if (!center) {
      setSelectedFilesByRequest({});
      return;
    }

    setSelectedFilesByRequest((current) => {
      const next: Record<string, string[]> = {};

      for (const request of center.requests) {
        const selectedByDefault = request.fileReviews
          .filter((file) => file.userSelectable && file.selectedByDefault)
          .map((file) => file.path);

        next[request.id] = current[request.id] ?? selectedByDefault;
      }

      return next;
    });
  }, [center]);

  if (!center) {
    return (
      <section className="approval-viewer">
        <div className="panel-header">
          <div>
            <h2>Approval Center</h2>
            <p className="muted">Start a session to collect pending runtime approvals.</p>
          </div>

          <Badge tone="slate">idle</Badge>
        </div>
      </section>
    );
  }

  return (
    <section className="approval-viewer">
      <div className="panel-header">
        <div>
          <h2>Approval Center</h2>
          <p className="muted">
            Centralized runtime approval queue. LLM proposes, runtime validates, user approves.
          </p>
        </div>

        <div className="approval-risk-badges">
          <Badge tone={center.pendingCount > 0 ? 'yellow' : 'green'}>
            {loading ? 'refreshing' : `${center.pendingCount} pending`}
          </Badge>
          <Badge tone={toneForRisk(center.highestRisk)}>{center.highestRisk} max risk</Badge>
        </div>
      </div>

      {center.requests.length === 0 ? (
        <article className="approval-blocker-note">
          <strong>No pending approvals.</strong>
          <p>Runtime has no approval gate waiting for user decision.</p>
        </article>
      ) : (
        <div className="approval-request-list">
          {center.requests.map((request) => (
            <ApprovalCardRouter
              key={request.id}
              request={request}
              selectedFilePaths={selectedFilesByRequest[request.id] ?? []}
              onToggleFile={(filePath) =>
                setSelectedFilesByRequest((current) => ({
                  ...current,
                  [request.id]: toggleFile(current[request.id] ?? [], filePath),
                }))
              }
              onSelectAll={() =>
                setSelectedFilesByRequest((current) => ({
                  ...current,
                  [request.id]: request.fileReviews
                    .filter((file) => file.userSelectable)
                    .map((file) => file.path),
                }))
              }
              onClearSelection={() =>
                setSelectedFilesByRequest((current) => ({
                  ...current,
                  [request.id]: [],
                }))
              }
              onDecision={onDecision}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface ApprovalCardRouterProps {
  request: ApprovalRequest;
  selectedFilePaths: string[];
  onToggleFile: (filePath: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDecision: (input: ApprovalDecisionViewInput) => void;
}

function ApprovalCardRouter(props: ApprovalCardRouterProps) {
  if (props.request.kind === 'patch') {
    return <PatchApprovalCard {...props} />;
  }

  if (props.request.kind === 'verify') {
    return <VerifyApprovalCard {...props} />;
  }

  if (props.request.kind === 'risk' || props.request.kind === 'dirty_working_tree') {
    return <RiskApprovalCard {...props} />;
  }

  return <ApprovalRequestCard {...props} />;
}

function toggleFile(current: string[], filePath: string): string[] {
  if (current.includes(filePath)) {
    return current.filter((candidate) => candidate !== filePath);
  }

  return [...current, filePath];
}

function toneForRisk(riskLevel: ApprovalCenterResult['highestRisk']) {
  if (riskLevel === 'high') {
    return 'red';
  }

  if (riskLevel === 'medium') {
    return 'yellow';
  }

  return 'green';
}
