import { Badge } from '../Badge';
import type { PatchDiffViewModel } from './DiffTypes';

interface PatchSummaryProps {
  patch: PatchDiffViewModel;
}

export function PatchSummary({ patch }: PatchSummaryProps) {
  const additions = patch.files.reduce((total, file) => total + file.additions, 0);
  const removals = patch.files.reduce((total, file) => total + file.removals, 0);
  const highRiskFiles = patch.files.filter((file) => file.riskLevel === 'high').length;

  return (
    <article className="patch-summary-card">
      <div>
        <strong>{patch.title}</strong>
        <p>{patch.summary}</p>
      </div>

      <div className="patch-summary-metrics">
        <Badge tone="blue">{patch.files.length} files</Badge>
        <Badge tone="green">+{additions}</Badge>
        <Badge tone="red">-{removals}</Badge>
        <Badge tone={highRiskFiles > 0 ? 'red' : 'green'}>{highRiskFiles} high risk</Badge>
      </div>
    </article>
  );
}
