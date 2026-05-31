import { ClipboardList, Route, ShieldCheck, Sparkles } from 'lucide-react';
import type { InteractiveSessionState, RuntimePlanGenerateResult } from '../../types/runtime';
import { Badge } from '../Badge';
import { PlanViewer } from '../plan/PlanViewer';

interface PlanPanelProps {
  session: InteractiveSessionState | null;
  runtimePlan: RuntimePlanGenerateResult | null;
  loading: boolean;
  onGeneratePlan: () => void;
  onGenerateProviderPlan: () => void;
  onApprovePlan: () => void;
  onRequestPlanChanges: () => void;
  onAddPlanRestriction: () => void;
  onViewPlanContext: () => void;
  onCancelPlan: () => void;
}

type PlanStageTone = 'blue' | 'green' | 'yellow' | 'red' | 'slate';

interface PlanStage {
  title: string;
  description: string;
  tone: PlanStageTone;
  label: string;
}

const toneStyles: Record<PlanStageTone, string> = {
  blue: 'border-blue-500/20 bg-blue-500/5',
  green: 'border-emerald-500/20 bg-emerald-500/5',
  yellow: 'border-yellow-500/20 bg-yellow-500/5',
  red: 'border-red-500/20 bg-red-500/5',
  slate: 'border-zinc-800/60 bg-zinc-900/40',
};

const textToneStyles: Record<PlanStageTone, string> = {
  blue: 'text-blue-500/80',
  green: 'text-emerald-500/80',
  yellow: 'text-yellow-500/80',
  red: 'text-red-500/80',
  slate: 'text-zinc-500',
};

const iconToneStyles: Record<PlanStageTone, string> = {
  blue: 'text-blue-400',
  green: 'text-emerald-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  slate: 'text-zinc-400',
};

export function PlanPanel({
  session,
  runtimePlan,
  loading,
  onGeneratePlan,
  onGenerateProviderPlan,
  onApprovePlan,
  onRequestPlanChanges,
  onAddPlanRestriction,
  onViewPlanContext,
  onCancelPlan,
}: PlanPanelProps) {
  const stage = buildPlanStage({
    session,
    runtimePlan,
    loading,
  });

  return (
    <section
      id="runtime-plan-panel"
      className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden shadow-sm"
    >
      <article className={`flex flex-col lg:flex-row gap-6 p-6 border-b ${toneStyles[stage.tone]}`}>
        <div className="flex-1 flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className={`mt-1 shrink-0 ${iconToneStyles[stage.tone]}`}>
              <ClipboardList size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Route size={14} className={textToneStyles[stage.tone]} />
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${textToneStyles[stage.tone]}`}
                >
                  Planning step
                </span>
                <Badge tone={stage.tone}>{stage.label}</Badge>
              </div>

              <h2 className="text-xl font-semibold text-zinc-100">{stage.title}</h2>
              <p
                className={`text-sm mt-1 max-w-xl ${stage.tone === 'slate' ? 'text-zinc-400' : 'text-zinc-300'}`}
              >
                {stage.description}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg border border-zinc-800/60 bg-zinc-950/40">
            <ShieldCheck size={18} className="text-zinc-500 mt-0.5 shrink-0" />
            <div>
              <strong className="block text-sm font-semibold text-zinc-300 mb-1">
                Why this step matters
              </strong>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The plan is the blueprint. Zero should explain what it wants to do before any patch
                proposal or file change exists.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 lg:w-72 shrink-0">
          <PlanReviewItem
            label="Session"
            description="A controlled runtime session must exist first."
            status={session ? 'Ready' : 'Needed'}
            tone={session ? 'green' : 'slate'}
          />

          <PlanReviewItem
            label="Plan"
            description="The implementation strategy should be generated and reviewable."
            status={runtimePlan ? 'Created' : 'Not started'}
            tone={runtimePlan ? 'green' : 'slate'}
          />

          <PlanReviewItem
            label="Validation"
            description="Runtime validation decides if the plan is safe enough to continue."
            status={validationLabel(runtimePlan)}
            tone={validationTone(runtimePlan)}
          />

          <PlanReviewItem
            label="Next"
            description="After a valid plan, you can continue with context, verification or patch."
            status={runtimePlan?.validation.valid === true ? 'Unlocked' : 'Waiting'}
            tone={runtimePlan?.validation.valid === true ? 'blue' : 'slate'}
          />
        </div>
      </article>

      <div className="p-6 flex flex-col gap-6">
        {!runtimePlan ? (
          <article className="flex items-start gap-3 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 shadow-sm">
            <Sparkles size={18} className="text-blue-400 mt-0.5 shrink-0" />
            <div>
              <strong className="block text-sm font-semibold text-blue-200 mb-1">
                Recommended path
              </strong>
              <p className="text-xs text-blue-200/70 leading-relaxed">
                Start with the deterministic plan. Use provider generation only when you want the
                selected model to propose the strategy.
              </p>
            </div>
          </article>
        ) : null}

        {runtimePlan?.validation.valid === false ? (
          <article className="flex items-start gap-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5 shadow-sm">
            <ShieldCheck size={18} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <strong className="block text-sm font-semibold text-red-200 mb-1">
                Plan blocked by runtime validation
              </strong>
              <p className="text-xs text-red-200/70 leading-relaxed">
                Do not continue to patch generation yet. Review the validation errors and generate a
                safer plan.
              </p>
            </div>
          </article>
        ) : null}

        <PlanViewer
          session={session}
          runtimePlan={runtimePlan}
          loading={loading}
          onGeneratePlan={onGeneratePlan}
          onGenerateProviderPlan={onGenerateProviderPlan}
          onApprovePlan={onApprovePlan}
          onRequestPlanChanges={onRequestPlanChanges}
          onAddPlanRestriction={onAddPlanRestriction}
          onViewPlanContext={onViewPlanContext}
          onCancelPlan={onCancelPlan}
        />
      </div>
    </section>
  );
}

function PlanReviewItem({
  label,
  description,
  status,
  tone,
}: {
  label: string;
  description: string;
  status: string;
  tone: PlanStageTone;
}) {
  return (
    <div className={`flex flex-col gap-2 p-3 rounded-lg border ${toneStyles[tone]}`}>
      <div className="flex justify-between items-start gap-2">
        <strong
          className={`text-xs font-bold uppercase tracking-wider ${
            tone === 'red'
              ? 'text-red-300'
              : tone === 'green'
                ? 'text-emerald-300'
                : tone === 'yellow'
                  ? 'text-yellow-300'
                  : tone === 'blue'
                    ? 'text-blue-300'
                    : 'text-zinc-300'
          }`}
        >
          {label}
        </strong>
        <Badge tone={tone} className="shrink-0 text-[10px]">
          {status}
        </Badge>
      </div>
      <p
        className={`text-[11px] leading-relaxed ${
          tone === 'red'
            ? 'text-red-200/70'
            : tone === 'green'
              ? 'text-emerald-200/70'
              : tone === 'yellow'
                ? 'text-yellow-200/80'
                : tone === 'blue'
                  ? 'text-blue-200/70'
                  : 'text-zinc-400'
        }`}
      >
        {description}
      </p>
    </div>
  );
}

function buildPlanStage(input: {
  session: InteractiveSessionState | null;
  runtimePlan: RuntimePlanGenerateResult | null;
  loading: boolean;
}): PlanStage {
  if (!input.session) {
    return {
      title: 'Start a session before planning',
      description:
        'Zero needs an active session and project goal before it can create a controlled plan.',
      tone: 'slate',
      label: 'waiting',
    };
  }

  if (input.loading) {
    return {
      title: 'Generating the plan',
      description: 'Zero is preparing a controlled implementation strategy for this session.',
      tone: 'yellow',
      label: 'running',
    };
  }

  if (!input.runtimePlan) {
    return {
      title: 'Create the implementation plan',
      description:
        'Generate a safe, reviewable plan before creating a patch proposal. No files will be changed.',
      tone: 'blue',
      label: 'ready',
    };
  }

  if (!input.runtimePlan.validation.valid) {
    return {
      title: 'Plan needs revision',
      description: 'Runtime validation rejected this plan. Fix the plan before moving forward.',
      tone: 'red',
      label: 'blocked',
    };
  }

  return {
    title: 'Plan is valid',
    description:
      'The runtime accepted this plan. Approve it, request changes, add restrictions or inspect context.',
    tone: 'green',
    label: 'validated',
  };
}

function validationLabel(plan: RuntimePlanGenerateResult | null): string {
  if (!plan) {
    return 'Not checked';
  }

  return plan.validation.valid ? 'Passed' : 'Blocked';
}

function validationTone(plan: RuntimePlanGenerateResult | null): PlanStageTone {
  if (!plan) {
    return 'slate';
  }

  return plan.validation.valid ? 'green' : 'red';
}
