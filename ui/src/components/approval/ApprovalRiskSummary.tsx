import { Badge } from '../Badge';
import type { ApprovalCenterResult } from './ApprovalTypes';

interface ApprovalRiskSummaryProps {
  center: ApprovalCenterResult | null;
}

export function ApprovalRiskSummary({ center }: ApprovalRiskSummaryProps) {
  if (!center) {
    return (
      <section className="approval-risk-summary">
        <Badge tone="slate">No approval center</Badge>
      </section>
    );
  }

  return (
    <section className="approval-risk-summary">
      <Badge tone={toneForRisk(center.highestRisk)}>{center.highestRisk} max risk</Badge>
      <Badge tone={center.pendingCount > 0 ? 'yellow' : 'green'}>
        {center.pendingCount} pending
      </Badge>
      <Badge tone="blue">{center.requests.length} request(s)</Badge>
    </section>
  );
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
