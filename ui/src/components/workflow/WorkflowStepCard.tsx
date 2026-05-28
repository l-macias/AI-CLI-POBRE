import { CheckCircle2, Circle, Lock, PlayCircle, ShieldAlert } from 'lucide-react';
import { Badge } from '../Badge';
import type { WorkflowStepViewModel } from './WorkflowTypes';

interface WorkflowStepCardProps {
  step: WorkflowStepViewModel;
}

export function WorkflowStepCard({ step }: WorkflowStepCardProps) {
  const targetPanelId = step.targetPanelId;

  return (
    <article
      className={`flex items-start gap-4 p-5 rounded-xl border transition-colors shadow-sm ${
        step.status === 'blocked'
          ? 'border-red-500/20 bg-red-500/5'
          : 'border-zinc-800/60 bg-zinc-900/40'
      }`}
    >
      <div
        className={`mt-0.5 shrink-0 ${
          step.status === 'completed'
            ? 'text-emerald-400'
            : step.status === 'blocked'
              ? 'text-red-400'
              : step.status === 'active' || step.status === 'available'
                ? 'text-blue-400'
                : 'text-zinc-500'
        }`}
      >
        <StepIcon status={step.status} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-2">
          <strong className="text-sm font-semibold text-zinc-200">{step.title}</strong>
          <Badge tone={toneForStatus(step.status)} className="shrink-0">
            {step.status}
          </Badge>
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed mb-3">{step.description}</p>

        {step.reason ? <p className="text-xs text-red-400/80 mb-3">{step.reason}</p> : null}

        {targetPanelId ? (
          <button
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none"
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
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function StepIcon({ status }: { status: WorkflowStepViewModel['status'] }) {
  if (status === 'completed') return <CheckCircle2 size={18} />;
  if (status === 'blocked') return <ShieldAlert size={18} />;
  if (status === 'active' || status === 'available') return <PlayCircle size={18} />;
  if (status === 'locked') return <Lock size={18} />;
  return <Circle size={18} />;
}

function toneForStatus(
  status: WorkflowStepViewModel['status'],
): 'blue' | 'green' | 'yellow' | 'red' | 'slate' {
  if (status === 'completed') return 'green';
  if (status === 'active' || status === 'available') return 'blue';
  if (status === 'blocked') return 'red';
  return 'slate';
}
