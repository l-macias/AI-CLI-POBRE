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
    <section className="flex flex-col gap-6 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm mb-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Route size={16} className="text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Guided workflow
          </span>
        </div>

        <h2 className="text-xl font-semibold text-zinc-100">
          {isComplete ? 'Workflow complete' : `You are here: ${workflow.currentStepTitle}`}
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
          Follow one safe step at a time. Zero keeps advanced evidence available, but the main flow
          stays focused on the next valid action.
        </p>
      </div>

      <div className="flex items-center gap-4 bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/60">
        <div className="flex flex-col items-center justify-center min-w-[60px]">
          <strong className="text-xl font-bold text-zinc-100">{workflow.percentage}%</strong>
          <span className="text-[10px] uppercase text-zinc-500 tracking-wider font-semibold">
            complete
          </span>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge tone={isComplete ? 'green' : 'blue'}>
              {workflow.completed}/{workflow.total} steps done
            </Badge>
            <Badge tone={remaining === 0 ? 'green' : 'yellow'}>
              {remaining === 0 ? 'ready' : `${remaining} remaining`}
            </Badge>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${workflow.percentage}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
