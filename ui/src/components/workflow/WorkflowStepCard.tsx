import { CheckCircle2, Circle, Lock, PlayCircle, ShieldAlert } from 'lucide-react';
import { Badge } from '../Badge';
import type { WorkflowStepViewModel } from './WorkflowTypes';

interface WorkflowStepCardProps {
  step: WorkflowStepViewModel;
}

export function WorkflowStepCard({ step }: WorkflowStepCardProps) {
  const targetPanelId = step.targetPanelId;

  return (
    <article className={`workflow-step-card workflow-step-${step.status}`}>
      <div className="workflow-step-icon">
        <StepIcon status={step.status} />
      </div>

      <div className="workflow-step-content">
        <div className="workflow-step-header">
          <strong>{step.title}</strong>
          <Badge tone={toneForStatus(step.status)}>{step.status}</Badge>
        </div>

        <p>{step.description}</p>

        {step.reason ? <p className="muted">{step.reason}</p> : null}

        {targetPanelId ? (
          <button
            className="workflow-panel-link secondary-button"
            onClick={() => scrollToPanel(targetPanelId)}
          >
            Open related panel
          </button>
        ) : null}
      </div>
    </article>
  );
}

function scrollToPanel(targetPanelId: string) {
  const element = document.getElementById(targetPanelId);

  element?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function StepIcon({ status }: { status: WorkflowStepViewModel['status'] }) {
  if (status === 'completed') {
    return <CheckCircle2 size={18} />;
  }

  if (status === 'active' || status === 'available') {
    return <PlayCircle size={18} />;
  }

  if (status === 'blocked') {
    return <ShieldAlert size={18} />;
  }

  if (status === 'locked') {
    return <Lock size={18} />;
  }

  return <Circle size={18} />;
}

function toneForStatus(
  status: WorkflowStepViewModel['status'],
): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
  if (status === 'completed') {
    return 'green';
  }

  if (status === 'active' || status === 'available') {
    return 'blue';
  }

  if (status === 'blocked') {
    return 'red';
  }

  return 'slate';
}
