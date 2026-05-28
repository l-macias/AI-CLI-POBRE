import { Activity } from 'lucide-react';
import type { RuntimeHealth } from '../types/runtime';
import { Badge } from './Badge';

interface RuntimeStatusProps {
  health: RuntimeHealth | null;
  compact?: boolean;
}

export function RuntimeStatus({ health, compact = false }: RuntimeStatusProps) {
  const online = health?.status === 'ok';

  if (compact) {
    return (
      <div className="runtime-status runtime-status-compact">
        <span className="runtime-status-icon">
          <Activity size={16} />
        </span>

        <div>
          <strong>{online ? 'Online' : 'Offline'}</strong>
          <span>{health?.service ?? 'zero-runtime-api'}</span>
        </div>

        <Badge tone={online ? 'green' : 'red'}>{online ? 'SSE ready' : 'check API'}</Badge>
      </div>
    );
  }

  return (
    <section className="runtime-status">
      <div className="runtime-status-icon">
        <Activity size={20} />
      </div>

      <div>
        <strong>{online ? 'Runtime online' : 'Runtime unavailable'}</strong>
        <p>{health?.service ?? 'zero-runtime-api'}</p>
      </div>

      <Badge tone={online ? 'green' : 'red'}>{online ? 'SSE ready' : 'check API'}</Badge>
    </section>
  );
}
