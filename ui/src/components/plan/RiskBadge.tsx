import { Badge } from '../Badge';
import type { PlanRiskLevel } from './PlanTypes';

interface RiskBadgeProps {
  risk: PlanRiskLevel;
}

export function RiskBadge({ risk }: RiskBadgeProps) {
  if (risk === 'high') {
    return <Badge tone="red">high risk</Badge>;
  }

  if (risk === 'medium') {
    return <Badge tone="yellow">medium risk</Badge>;
  }

  return <Badge tone="green">low risk</Badge>;
}
