import { CheckCircle2, Circle, CircleAlert, Lock } from 'lucide-react';
import { Badge } from '../Badge';
import { RiskBadge } from './RiskBadge';
import type { PlanStepViewModel } from './PlanTypes';

interface PlanStepCardProps {
  step: PlanStepViewModel;
}

export function PlanStepCard({ step }: PlanStepCardProps) {
  return (
    <article className="plan-step-card">
      <div className="plan-step-icon">
        <StepIcon status={step.status} />
      </div>

      <div className="plan-step-content">
        <div className="plan-step-header">
          <strong>{step.title}</strong>
          <div className="plan-step-badges">
            <RiskBadge risk={step.riskLevel} />
            <Badge tone={toneForStatus(step.status)}>{step.status}</Badge>
          </div>
        </div>

        <p>{step.description}</p>

        {step.target ? <span className="plan-step-target">{step.target}</span> : null}
      </div>
    </article>
  );
}

function StepIcon({ status }: { status: PlanStepViewModel['status'] }) {
  if (status === 'completed') {
    return <CheckCircle2 size={18} />;
  }

  if (status === 'blocked') {
    return <Lock size={18} />;
  }

  if (status === 'ready') {
    return <CircleAlert size={18} />;
  }

  return <Circle size={18} />;
}

function toneForStatus(
  status: PlanStepViewModel['status'],
): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
  if (status === 'completed') {
    return 'green';
  }

  if (status === 'blocked') {
    return 'red';
  }

  if (status === 'ready') {
    return 'blue';
  }

  return 'slate';
}
