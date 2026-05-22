import { Activity } from 'lucide-react';
import type { RuntimeHealth } from '../types/runtime';
import { Badge } from './Badge';

interface RuntimeStatusProps {
  health: RuntimeHealth | null;
}

export function RuntimeStatus({ health }: RuntimeStatusProps) {
  const online = health?.status === 'ok';

  return (
    <section className="runtime-status">
      <div className="runtime-status-icon">
        <Activity size={20} />
      </div>
      <div>
        <strong>{online ? 'Runtime online' : 'Runtime offline'}</strong>
        <p>{health?.service ?? 'zero-runtime-api'}</p>
      </div>
      <Badge tone={online ? 'green' : 'red'}>{online ? 'SSE ready' : 'offline'}</Badge>
    </section>
  );
}
