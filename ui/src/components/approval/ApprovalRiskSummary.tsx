import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { Badge } from '../Badge';
import type { ApprovalViewModel } from './ApprovalTypes';

interface ApprovalRiskSummaryProps {
  approval: ApprovalViewModel;
}

export function ApprovalRiskSummary({ approval }: ApprovalRiskSummaryProps) {
  const highRisk = approval.riskLevel === 'high';

  return (
    <article
      className={highRisk ? 'approval-risk-card approval-risk-card-high' : 'approval-risk-card'}
    >
      <div className="approval-risk-icon">
        {highRisk ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
      </div>

      <div>
        <strong>{approval.title}</strong>
        <p>
          Runtime approval gate is active. Patch application remains blocked until explicit user
          approval.
        </p>

        <div className="approval-risk-badges">
          <Badge
            tone={
              approval.riskLevel === 'high'
                ? 'red'
                : approval.riskLevel === 'medium'
                  ? 'yellow'
                  : 'green'
            }
          >
            {approval.riskLevel} risk
          </Badge>
          <Badge tone="blue">{approval.workspaceMode}</Badge>
          <Badge tone={approval.gitActive ? 'green' : 'slate'}>
            Git {approval.gitActive ? 'active' : 'inactive'}
          </Badge>
          <Badge tone={approval.snapshotAvailable ? 'green' : 'yellow'}>
            Snapshot {approval.snapshotAvailable ? 'ready' : 'missing'}
          </Badge>
        </div>
      </div>
    </article>
  );
}
