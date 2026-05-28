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
    <article className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 rounded-lg border border-zinc-800/60 bg-zinc-950/50 shadow-sm mb-6">
      <div className="flex-1 min-w-0">
        <strong className="block text-sm font-semibold text-zinc-200">{patch.title}</strong>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{patch.summary}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Badge tone="blue">{patch.files.length} files</Badge>
        <Badge tone="green">+{additions}</Badge>
        <Badge tone="red">-{removals}</Badge>
        <Badge tone={highRiskFiles > 0 ? 'red' : 'green'}>{highRiskFiles} high risk</Badge>
      </div>
    </article>
  );
}
