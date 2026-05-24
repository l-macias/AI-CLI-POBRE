import { Route } from 'lucide-react';
import { Badge } from '../Badge';
import type { WorkflowProgressViewModel } from './WorkflowTypes';

interface WorkflowProgressHeaderProps {
  workflow: WorkflowProgressViewModel;
}

export function WorkflowProgressHeader({ workflow }: WorkflowProgressHeaderProps) {
  return (
    <section className="workflow-progress-header">
      <div className="panel-title-row">
        <Route size={20} />
        <div>
          <h2>Guided workflow</h2>
          <p className="muted">Current step: {workflow.currentStepTitle}</p>
        </div>
      </div>

      <div className="workflow-progress-meta">
        <Badge tone="blue">
          {workflow.completed}/{workflow.total} completed
        </Badge>
        <Badge tone={workflow.percentage === 100 ? 'green' : 'yellow'}>
          {workflow.percentage}%
        </Badge>
      </div>

      <progress max={100} value={workflow.percentage} />
    </section>
  );
}
