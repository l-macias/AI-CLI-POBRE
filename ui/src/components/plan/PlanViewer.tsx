import { ListChecks } from 'lucide-react';
import type { InteractiveSessionState } from '../../types/runtime';
import { Badge } from '../Badge';
import { PlanActions } from './PlanActions';
import { PlanStepCard } from './PlanStepCard';
import type { PlanRiskLevel, PlanStepViewModel, PlanViewModel } from './PlanTypes';
import { RiskBadge } from './RiskBadge';

interface PlanViewerProps {
  session: InteractiveSessionState | null;
  onCommand: (command: string) => void;
}

export function PlanViewer({ session, onCommand }: PlanViewerProps) {
  const plan = buildPlanViewModel(session);

  return (
    <section className="plan-viewer">
      <div className="panel-header">
        <div className="panel-title-row">
          <ListChecks size={18} />
          <div>
            <h2>Plan Proposal</h2>
            <p className="muted">Review runtime intent before patches are generated.</p>
          </div>
        </div>

        {plan ? <RiskBadge risk={plan.riskLevel} /> : <Badge tone="slate">empty</Badge>}
      </div>

      {plan ? (
        <>
          <article className="plan-summary-card">
            <div>
              <strong>{plan.title}</strong>
              <p>{plan.summary}</p>
            </div>
            <Badge tone="blue">{plan.steps.length} steps</Badge>
          </article>

          <div className="plan-step-list">
            {plan.steps.map((step) => (
              <PlanStepCard step={step} key={step.id} />
            ))}
          </div>

          <PlanActions
            disabled={!session}
            onApprovePlan={() => onCommand('Aprobar plan')}
            onRequestChanges={() => onCommand('/revise Ajustar el plan antes de generar cambios')}
            onAddRestriction={() =>
              onCommand('Agregar restricción: no aplicar cambios sin mostrar diff')
            }
            onViewContext={() => onCommand('/context')}
            onCancel={() => onCommand('/reject')}
          />
        </>
      ) : (
        <div className="empty-plan-state">
          <strong>No plan proposed yet.</strong>
          <p className="muted">
            Send <code>/plan</code> or describe what you want Zero Runtime to inspect.
          </p>
          <button disabled={!session} onClick={() => onCommand('/plan')}>
            Request plan
          </button>
        </div>
      )}
    </section>
  );
}

function buildPlanViewModel(session: InteractiveSessionState | null): PlanViewModel | null {
  if (!session) {
    return null;
  }

  const planActions = session.runtimeActions.filter((action) => {
    const text = `${action.title} ${action.description}`.toLowerCase();

    return text.includes('plan') || text.includes('context') || text.includes('files');
  });

  if (planActions.length === 0) {
    return {
      id: `synthetic-plan-${session.id}`,
      title: 'Initial runtime plan',
      summary:
        'The runtime has an active session but no detailed plan has been produced yet. This placeholder shows the expected review flow.',
      riskLevel: 'low',
      steps: [
        {
          id: 'step-collect-context',
          title: 'Collect project context',
          description: 'Identify relevant files and protected paths before proposing edits.',
          status: 'pending',
          riskLevel: 'low',
          target: session.projectRoot,
        },
        {
          id: 'step-propose-plan',
          title: 'Propose plan',
          description: 'Prepare a structured plan for user approval before generating patches.',
          status: 'pending',
          riskLevel: 'low',
        },
      ],
    };
  }

  const steps: PlanStepViewModel[] = planActions.map((action, index): PlanStepViewModel => {
    const status: PlanStepViewModel['status'] =
      action.status === 'completed'
        ? 'completed'
        : action.status === 'blocked'
          ? 'blocked'
          : 'ready';

    return {
      id: action.id,
      title: action.title,
      description: action.description,
      status,
      riskLevel: inferRisk(action.title, action.description),
      ...(index === 0 ? { target: session.projectRoot } : {}),
    };
  });

  return {
    id: `plan-${session.id}`,
    title: 'Runtime proposed plan',
    summary: 'Plan-related runtime actions were recorded during this interactive session.',
    riskLevel: highestRisk(steps.map((step) => step.riskLevel)),
    steps,
  };
}

function inferRisk(title: string, description: string): PlanRiskLevel {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('apply') || text.includes('patch') || text.includes('delete')) {
    return 'high';
  }

  if (text.includes('protected') || text.includes('risk') || text.includes('database')) {
    return 'medium';
  }

  return 'low';
}

function highestRisk(risks: PlanRiskLevel[]): PlanRiskLevel {
  if (risks.includes('high')) {
    return 'high';
  }

  if (risks.includes('medium')) {
    return 'medium';
  }

  return 'low';
}
