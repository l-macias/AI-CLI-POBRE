import { Activity, ShieldCheck } from 'lucide-react';
import { Badge } from '../Badge';
import type { RuntimeHealth } from '../../types/runtime';

interface RuntimeHealthCardProps {
  health: RuntimeHealth | null;
}

export function RuntimeHealthCard({ health }: RuntimeHealthCardProps) {
  return (
    <article className="dashboard-card">
      <div className="dashboard-card-header">
        <div className="dashboard-title-row">
          <Activity size={18} />
          <strong>Runtime health</strong>
        </div>

        <Badge tone={health?.status === 'ok' ? 'green' : 'yellow'}>
          {health?.status ?? 'unknown'}
        </Badge>
      </div>

      <div className="dashboard-facts">
        <span>Service: {health?.service ?? 'not loaded'}</span>
        <span>Realtime: {health?.realtime ?? 'unknown'}</span>
        <span>Local only: {health?.localOnly ? 'yes' : 'unknown'}</span>
      </div>

      <div className="dashboard-card-footer">
        <ShieldCheck size={16} />
        Runtime authority preserved.
      </div>
    </article>
  );
}
