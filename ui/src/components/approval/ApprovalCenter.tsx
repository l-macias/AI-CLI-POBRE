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
      <section className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Approval Center</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Runtime approvals appear here after a plan, patch, verify command or risk gate is
              ready.
            </p>
          </div>

          <Badge tone={loading ? 'yellow' : 'slate'}>{loading ? 'loading' : 'idle'}</Badge>
        </div>

        <article className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50">
          <strong className="text-sm font-medium text-zinc-300">No approval center loaded.</strong>
          <p className="text-xs text-zinc-500 mt-2 max-w-sm">
            Prepare workflow, generate a patch, or refresh approvals after creating a diff.
          </p>
        </article>
      </section>
    );
  }

  const patchRequests = center.requests.filter((request) => request.kind === 'patch').length;
  const verifyRequests = center.requests.filter((request) => request.kind === 'verify').length;
  const riskRequests = center.requests.filter(
    (request) => request.kind === 'risk' || request.kind === 'dirty_working_tree',
  ).length;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Approval Center</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Central runtime approval queue. LLM proposes, runtime validates, user approves.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone={center.pendingCount > 0 ? 'yellow' : 'green'}>
            {loading ? 'refreshing' : `${center.pendingCount} pending`}
          </Badge>
          <Badge tone={toneForRisk(center.highestRisk)}>{center.highestRisk} max risk</Badge>
          <Badge tone={patchRequests > 0 ? 'blue' : 'slate'}>{patchRequests} patch</Badge>
          <Badge tone={verifyRequests > 0 ? 'blue' : 'slate'}>{verifyRequests} verify</Badge>
          <Badge tone={riskRequests > 0 ? 'yellow' : 'slate'}>{riskRequests} risk</Badge>
        </div>
      </div>

      {center.requests.length === 0 ? (
        <article className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50">
          <strong className="text-sm font-medium text-zinc-300">No pending approvals.</strong>
          <p className="text-xs text-zinc-500 mt-2 max-w-md">
            Runtime has no approval gate waiting for user decision. Generate a diff or run a gated
            action to create a new request.
          </p>
        </article>
      ) : (
        <div className="flex flex-col gap-6">
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
