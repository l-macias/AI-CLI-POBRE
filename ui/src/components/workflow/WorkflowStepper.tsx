import type { WorkflowStepViewModel } from './WorkflowTypes';
import { WorkflowStepCard } from './WorkflowStepCard';

interface WorkflowStepperProps {
  workflow: { steps: WorkflowStepViewModel[] };
}

export function WorkflowStepper({ workflow }: WorkflowStepperProps) {
  return (
    <div className="flex flex-col gap-3">
      {workflow.steps.map((step) => (
        <WorkflowStepCard step={step} key={step.id} />
      ))}
    </div>
  );
}
