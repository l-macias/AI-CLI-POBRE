import type { WorkflowProgressViewModel } from './WorkflowTypes';
import { WorkflowStepCard } from './WorkflowStepCard';

interface WorkflowStepperProps {
  workflow: WorkflowProgressViewModel;
}

export function WorkflowStepper({ workflow }: WorkflowStepperProps) {
  return (
    <section className="workflow-stepper">
      {workflow.steps.map((step) => (
        <WorkflowStepCard step={step} key={step.id} />
      ))}
    </section>
  );
}
