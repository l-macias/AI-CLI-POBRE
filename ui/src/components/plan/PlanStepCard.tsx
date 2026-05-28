import { CheckCircle2, Circle, CircleAlert, Lock } from 'lucide-react';
import { Badge } from '../Badge';
import { RiskBadge } from './RiskBadge';
import type { PlanStepViewModel } from './PlanTypes';

interface PlanStepCardProps {
  step: PlanStepViewModel;
}

export function PlanStepCard({ step }: PlanStepCardProps) {
  return (
    <article className="flex items-start gap-4 p-5 rounded-xl border border-zinc-800/60 bg-zinc-950/50 hover:border-zinc-700/80 transition-colors shadow-sm">
      <div className="mt-0.5 shrink-0 text-zinc-500">
        <StepIcon status={step.status} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-1">
          <strong className="text-sm font-semibold text-zinc-200">{step.title}</strong>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <RiskBadge risk={step.riskLevel} />
            <Badge tone={toneForStatus(step.status)}>{step.status}</Badge>
          </div>
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>

        {step.target ? (
          <span className="inline-block mt-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 break-all w-fit">
            {step.target}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function StepIcon({ status }: { status: PlanStepViewModel['status'] }) {
  if (status === 'completed') {
    return <CheckCircle2 size={18} className="text-emerald-400" />;
  }

  if (status === 'blocked') {
    return <Lock size={18} className="text-red-400" />;
  }

  if (status === 'ready') {
    return <CircleAlert size={18} className="text-blue-400" />;
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
