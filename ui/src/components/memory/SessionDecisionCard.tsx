import { Badge } from '../Badge';
import type { SessionDecision } from './MemoryTypes';

interface SessionDecisionCardProps {
  decision: SessionDecision;
}

export function SessionDecisionCard({ decision }: SessionDecisionCardProps) {
  return (
    <article className="memory-card">
      <div className="memory-card-header">
        <strong>{decision.statement}</strong>

        <div className="memory-badge-row">
          <Badge tone="blue">{decision.category}</Badge>
          <Badge tone={toneForStrength(decision.strength)}>{decision.strength}</Badge>
          <Badge tone="slate">{decision.source}</Badge>
        </div>
      </div>

      <p className="muted">Normalized: {decision.normalizedStatement}</p>
      <span className="memory-date">{new Date(decision.createdAt).toLocaleString()}</span>
    </article>
  );
}

function toneForStrength(strength: SessionDecision['strength']) {
  if (strength === 'hard_rule') {
    return 'red';
  }

  if (strength === 'constraint') {
    return 'yellow';
  }

  return 'green';
}
