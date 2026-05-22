import { ListChecks, ShieldAlert } from 'lucide-react';
import type { InteractiveSessionState, RuntimePlanGenerateResult } from '../../types/runtime';
import { Badge } from '../Badge';
import { PlanActions } from './PlanActions';
import { PlanStepCard } from './PlanStepCard';
import type { PlanRiskLevel, PlanStepViewModel, PlanViewModel } from './PlanTypes';
import { RiskBadge } from './RiskBadge';

interface PlanViewerProps {
  session: InteractiveSessionState | null;
  runtimePlan: RuntimePlanGenerateResult | null;
  loading: boolean;
  onGeneratePlan: () => void;
  onGenerateProviderPlan: () => void;
  onCommand: (command: string) => void;
}

export function PlanViewer({
  session,
  runtimePlan,
  loading,
  onGeneratePlan,
  onGenerateProviderPlan,
  onCommand,
}: PlanViewerProps) {
  const plan = runtimePlan
    ? buildRuntimePlanViewModel(runtimePlan)
    : buildFallbackPlanViewModel(session);

  return (
    <section className="plan-viewer">
      <div className="panel-header">
        <div className="panel-title-row">
          <ListChecks size={18} />
          <div>
            <h2>Runtime Plan</h2>
            <p className="muted">Structured runtime plan before patch generation.</p>
          </div>
        </div>

        {plan ? <RiskBadge risk={plan.riskLevel} /> : <Badge tone="slate">empty</Badge>}
      </div>

      <div className="plan-actions">
        <button disabled={!session || loading} onClick={onGeneratePlan}>
          {loading ? 'Generating...' : 'Generate Runtime Plan'}
        </button>

        <button
          disabled={!session || loading}
          className="secondary-button"
          onClick={onGenerateProviderPlan}
        >
          {loading ? 'Generating...' : 'Generate with Provider'}
        </button>
      </div>

      {plan ? (
        <>
          <article className="plan-summary-card">
            <div>
              <strong>{plan.title}</strong>
              <p>{plan.summary}</p>
            </div>

            <div className="plan-step-badges">
              <Badge tone={runtimePlan?.source === 'fallback' ? 'yellow' : 'blue'}>
                source: {runtimePlan?.source ?? 'preview'}
              </Badge>
              <Badge tone={plan.status === 'rejected' ? 'red' : 'blue'}>
                {plan.status ?? 'preview'}
              </Badge>
              <Badge tone={plan.needsSnapshot ? 'yellow' : 'slate'}>
                snapshot: {plan.needsSnapshot ? 'required' : 'not required'}
              </Badge>
              <Badge tone={plan.requiresApproval ? 'yellow' : 'green'}>
                approval: {plan.requiresApproval ? 'required' : 'not required'}
              </Badge>
              <Badge tone="blue">{plan.steps.length} steps</Badge>
            </div>
          </article>
          {runtimePlan?.providerAudit || runtimePlan?.fallbackReason ? (
            <article className="plan-summary-card">
              <div>
                <strong>Provider audit</strong>
                <p className="muted">
                  Provider output is proposal-only. Runtime validation remains authoritative.
                </p>
              </div>

              {runtimePlan.providerAudit ? (
                <div className="plan-step-list">
                  <article className="plan-step-card">
                    <div className="plan-step-content">
                      <div className="plan-step-header">
                        <strong>
                          {runtimePlan.providerAudit.provider} / {runtimePlan.providerAudit.model}
                        </strong>
                        <Badge tone="blue">provider</Badge>
                      </div>
                      <p>
                        Tokens:{' '}
                        {runtimePlan.providerAudit.usage?.totalTokens ??
                          runtimePlan.providerAudit.usage?.promptTokens ??
                          'unknown'}
                      </p>
                    </div>
                  </article>
                </div>
              ) : null}

              {runtimePlan.fallbackReason ? (
                <div className="plan-step-list">
                  <article className="plan-step-card">
                    <div className="plan-step-content">
                      <div className="plan-step-header">
                        <strong>Fallback reason</strong>
                        <Badge tone="yellow">fallback</Badge>
                      </div>
                      <p>{runtimePlan.fallbackReason}</p>
                    </div>
                  </article>
                </div>
              ) : null}
            </article>
          ) : null}

          {plan.validationIssues && plan.validationIssues.length > 0 ? (
            <article className="plan-summary-card">
              <div className="panel-title-row">
                <ShieldAlert size={18} />
                <div>
                  <strong>Validation issues</strong>
                  <p className="muted">Runtime policy rejected or warned about this plan.</p>
                </div>
              </div>

              <div className="plan-step-list">
                {plan.validationIssues.map((issue) => (
                  <article
                    className="plan-step-card"
                    key={`${issue.code}-${issue.path ?? 'global'}`}
                  >
                    <div className="plan-step-content">
                      <div className="plan-step-header">
                        <strong>{issue.code}</strong>
                        <Badge tone={issue.severity === 'error' ? 'red' : 'yellow'}>
                          {issue.severity}
                        </Badge>
                      </div>
                      <p>{issue.message}</p>
                      {issue.path ? <span className="plan-step-target">{issue.path}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          {plan.candidateFiles && plan.candidateFiles.length > 0 ? (
            <article className="plan-summary-card">
              <div>
                <strong>Candidate files</strong>
                <p className="muted">
                  Files selected or inferred for the next patch proposal stage.
                </p>
              </div>

              <div className="plan-step-list">
                {plan.candidateFiles.map((file) => (
                  <article className="plan-step-card" key={file.path}>
                    <div className="plan-step-content">
                      <div className="plan-step-header">
                        <strong>{file.path}</strong>
                        <Badge tone={file.existsKnown ? 'green' : 'slate'}>
                          {file.existsKnown ? 'known' : 'inferred'}
                        </Badge>
                      </div>
                      <p>{file.reason}</p>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          <div className="plan-step-list">
            {plan.steps.map((step) => (
              <PlanStepCard step={step} key={step.id} />
            ))}
          </div>

          {plan.risks && plan.risks.length > 0 ? (
            <article className="plan-summary-card">
              <div>
                <strong>Risks</strong>
                <p className="muted">Runtime risk analysis for this plan.</p>
              </div>

              <div className="plan-step-list">
                {plan.risks.map((risk) => (
                  <article className="plan-step-card" key={risk.code}>
                    <div className="plan-step-content">
                      <div className="plan-step-header">
                        <strong>{risk.code}</strong>
                        <RiskBadge risk={risk.level} />
                      </div>
                      <p>{risk.message}</p>
                      <p className="muted">{risk.mitigation}</p>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          {plan.verifyCommands && plan.verifyCommands.length > 0 ? (
            <article className="plan-summary-card">
              <div>
                <strong>Suggested verify commands</strong>
                <p className="muted">These still require explicit approval before execution.</p>
              </div>

              <div className="plan-step-list">
                {plan.verifyCommands.map((verifyCommand) => (
                  <article
                    className="plan-step-card"
                    key={`${verifyCommand.command}-${verifyCommand.args.join('-')}`}
                  >
                    <div className="plan-step-content">
                      <div className="plan-step-header">
                        <strong>
                          {verifyCommand.command} {verifyCommand.args.join(' ')}
                        </strong>
                        <Badge tone="yellow">approval required</Badge>
                      </div>
                      <p>{verifyCommand.reason}</p>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          <PlanActions
            disabled={!session || !runtimePlan || runtimePlan.plan.status !== 'validated'}
            onApprovePlan={() => onCommand('Aprobar plan runtime')}
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
          <strong>No runtime plan generated yet.</strong>
          <p className="muted">Generate a structured runtime plan from the current session goal.</p>
          <button disabled={!session || loading} onClick={onGeneratePlan}>
            {loading ? 'Generating...' : 'Generate Runtime Plan'}
          </button>
        </div>
      )}
    </section>
  );
}

function buildRuntimePlanViewModel(result: RuntimePlanGenerateResult): PlanViewModel {
  return {
    id: result.plan.id,
    title: result.plan.objective,
    summary: result.plan.scope.summary,
    riskLevel: result.plan.riskLevel,
    status: result.plan.status,
    needsSnapshot: result.plan.needsSnapshot,
    requiresApproval: result.plan.requiresApproval,
    candidateFiles: result.plan.scope.candidateFiles,
    risks: result.plan.risks,
    verifyCommands: result.plan.verifyCommands,
    validationIssues: result.validation.issues,
    steps: result.plan.steps.map((step): PlanStepViewModel => {
      return {
        id: step.id,
        title: step.title,
        description: step.description,
        status: result.validation.valid ? 'ready' : 'blocked',
        riskLevel: result.plan.riskLevel,
        requiresApproval: step.requiresApproval,
      };
    }),
  };
}

function buildFallbackPlanViewModel(session: InteractiveSessionState | null): PlanViewModel | null {
  if (!session) {
    return null;
  }

  const planActions = session.runtimeActions.filter((action) => {
    const text = `${action.title} ${action.description}`.toLowerCase();

    return text.includes('plan') || text.includes('context') || text.includes('files');
  });

  if (planActions.length === 0) {
    return null;
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
    title: 'Runtime session activity',
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
