import { AlertTriangle } from 'lucide-react';
import { Badge } from '../Badge';
import type { DecisionConflict } from './MemoryTypes';

interface DecisionConflictCardProps {
  conflict: DecisionConflict;
}

export function DecisionConflictCard({ conflict }: DecisionConflictCardProps) {
  return (
    <article className="memory-conflict-card">
      <div className="memory-conflict-icon">
        <AlertTriangle size={18} />
      </div>

      <div>
        <div className="memory-card-header">
          <strong>{conflict.reason}</strong>
          <Badge tone={conflict.severity === 'error' ? 'red' : 'yellow'}>{conflict.severity}</Badge>
        </div>

        <p>
          <strong>A:</strong> {conflict.decisionA.statement}
        </p>
        <p>
          <strong>B:</strong> {conflict.decisionB.statement}
        </p>
      </div>
    </article>
  );
}
