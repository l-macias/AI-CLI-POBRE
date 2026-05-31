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
  onCommand: (command: string) => void;
}

type PlanStageTone = 'blue' | 'green' | 'yellow' | 'red' | 'slate';

interface PlanStage {
  title: string;
  description: string;
  tone: PlanStageTone;
  label: string;
}

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
    <section id="runtime-plan-panel" className="panel session-plan-panel">
      <article className={`plan-review-hero plan-review-hero-${stage.tone}`}>
        <div className="plan-review-main">
          <div className="panel-title-row">
            <ClipboardList size={20} />
            <div>
              <div className="workflow-kicker">
                <Route size={16} />
                <span>Planning step</span>
                <Badge tone={stage.tone}>{stage.label}</Badge>
              </div>

              <h2>{stage.title}</h2>
              <p className="muted">{stage.description}</p>
            </div>
          </div>

          <div className="plan-safety-message">
            <ShieldCheck size={18} />
            <div>
              <strong>Why this step matters</strong>
              <p>
                The plan is the blueprint. Zero should explain what it wants to do before any patch
                proposal or file change exists.
              </p>
            </div>
          </div>
        </div>

        <div className="plan-review-checklist">
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

      {!runtimePlan ? (
        <article className="plan-beginner-note">
          <Sparkles size={18} />
          <div>
            <strong>Recommended path</strong>
            <p>
              Start with the deterministic plan. Use provider generation only when you want the
              selected model to propose the strategy.
            </p>
          </div>
        </article>
      ) : null}

      {runtimePlan?.validation.valid === false ? (
        <article className="plan-beginner-note warning">
          <ShieldCheck size={18} />
          <div>
            <strong>Plan blocked by runtime validation</strong>
            <p>
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
    <div className={`plan-review-item plan-review-item-${tone}`}>
      <div>
        <strong>{label}</strong>
        <p>{description}</p>
      </div>

      <Badge tone={tone}>{status}</Badge>
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
