import { Route } from 'lucide-react';
import { Badge } from '../Badge';
import type { WorkflowProgressViewModel } from './WorkflowTypes';

interface WorkflowProgressHeaderProps {
  workflow: WorkflowProgressViewModel;
}

export function WorkflowProgressHeader({ workflow }: WorkflowProgressHeaderProps) {
  const remaining = Math.max(workflow.total - workflow.completed, 0);
  const isComplete = workflow.percentage === 100;

  return (
    <section className="workflow-progress-header workflow-progress-header-friendly">
      <div className="workflow-progress-copy">
        <div className="workflow-kicker">
          <Route size={18} />
          <span>Guided workflow</span>
        </div>

        <h2>{isComplete ? 'Workflow complete' : `You are here: ${workflow.currentStepTitle}`}</h2>

        <p className="muted">
          Follow one safe step at a time. Zero keeps advanced evidence available, but the main flow
          stays focused on the next valid action.
        </p>
      </div>

      <div className="workflow-progress-summary-card">
        <div>
          <strong>{workflow.percentage}%</strong>
          <span>complete</span>
        </div>

        <div className="workflow-progress-summary-badges">
          <Badge tone={isComplete ? 'green' : 'blue'}>
            {workflow.completed}/{workflow.total} steps done
          </Badge>

          <Badge tone={remaining === 0 ? 'green' : 'yellow'}>
            {remaining === 0 ? 'ready' : `${remaining} remaining`}
          </Badge>
        </div>
      </div>

      <progress max={100} value={workflow.percentage} />
    </section>
  );
}
