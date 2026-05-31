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
  onApprovePlan: () => void;
  onRequestPlanChanges: () => void;
  onAddPlanRestriction: () => void;
  onViewPlanContext: () => void;
  onCancelPlan: () => void;
}

export function PlanViewer({
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
}: PlanViewerProps) {
  const plan = runtimePlan
    ? buildRuntimePlanViewModel(runtimePlan)
    : buildFallbackPlanViewModel(session);

  return (
    <section className="flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <ListChecks size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Runtime Plan</h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Structured runtime plan before patch generation.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {plan ? <RiskBadge risk={plan.riskLevel} /> : <Badge tone="slate">empty</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={!session || loading}
          onClick={onGeneratePlan}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {loading ? 'Generating...' : 'Generate Runtime Plan'}
        </button>

        <button
          disabled={!session || loading}
          onClick={onGenerateProviderPlan}
          className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500"
        >
          {loading ? 'Generating...' : 'Generate with Provider'}
        </button>
      </div>

      {plan ? (
        <>
          <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm mt-2">
            <div>
              <strong className="block text-base font-semibold text-zinc-100">{plan.title}</strong>
              <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{plan.summary}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2 border-t border-zinc-800/60 pt-4">
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

          {runtimePlan?.providerAudit ||
          runtimePlan?.fallbackReason ||
          runtimePlan?.providerFailure ? (
            <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm">
              <div className="border-b border-zinc-800/60 pb-4">
                <strong className="block text-base font-medium text-zinc-100">
                  Provider audit
                </strong>
                <p className="text-sm text-zinc-400 mt-1">
                  Provider output is proposal-only. Runtime validation remains authoritative.
                </p>
              </div>

              {runtimePlan.providerAudit ? (
                <div className="flex flex-col gap-3">
                  <article className="flex flex-col gap-2 p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50">
                    <div className="flex justify-between items-start gap-3">
                      <strong className="text-sm font-semibold text-zinc-200">
                        {runtimePlan.providerAudit.provider} / {runtimePlan.providerAudit.model}
                      </strong>
                      <Badge tone="blue">provider</Badge>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Tokens:{' '}
                      {runtimePlan.providerAudit.usage?.totalTokens ??
                        runtimePlan.providerAudit.usage?.promptTokens ??
                        'unknown'}
                    </p>
                  </article>
                </div>
              ) : null}

              {runtimePlan.fallbackReason ? (
                <div className="flex flex-col gap-3">
                  <article className="flex flex-col gap-2 p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50">
                    <div className="flex justify-between items-start gap-3">
                      <strong className="text-sm font-semibold text-zinc-200">
                        Fallback reason
                      </strong>
                      <Badge tone="yellow">fallback</Badge>
                    </div>
                    <p className="text-sm text-zinc-300 mt-1">{runtimePlan.fallbackReason}</p>
                  </article>
                </div>
              ) : null}

              {runtimePlan.providerFailure ? (
                <div className="flex flex-col gap-3">
                  <article className="flex flex-col gap-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                    <div className="flex justify-between items-start gap-3">
                      <strong className="text-sm font-semibold text-red-300">
                        Provider failure details
                      </strong>
                      <Badge tone="red">debug</Badge>
                    </div>

                    <p className="text-sm text-red-200/80">
                      {runtimePlan.providerFailure.name}: {runtimePlan.providerFailure.message}
                    </p>

                    {runtimePlan.providerFailure.code ? (
                      <span className="inline-block px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-300 w-fit">
                        {runtimePlan.providerFailure.code}
                      </span>
                    ) : null}

                    {runtimePlan.providerFailure.cause ? (
                      <pre className="p-3 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                        {JSON.stringify(runtimePlan.providerFailure.cause, null, 2)}
                      </pre>
                    ) : null}
                  </article>
                </div>
              ) : null}
            </article>
          ) : null}

          {plan.validationIssues && plan.validationIssues.length > 0 ? (
            <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm">
              <div className="flex items-start gap-3 border-b border-zinc-800/60 pb-4">
                <ShieldAlert size={18} className="text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <strong className="block text-base font-medium text-zinc-100">
                    Validation issues
                  </strong>
                  <p className="text-sm text-zinc-400 mt-1">
                    Runtime policy rejected or warned about this plan.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {plan.validationIssues.map((issue) => (
                  <article
                    className="flex flex-col gap-2 p-3 rounded-md border border-zinc-800/40 bg-zinc-950/50"
                    key={`${issue.code}-${issue.path ?? 'global'}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <strong className="text-sm font-semibold text-zinc-200">{issue.code}</strong>
                      <Badge tone={issue.severity === 'error' ? 'red' : 'yellow'}>
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-400">{issue.message}</p>
                    {issue.path ? (
                      <span className="inline-block mt-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300 break-all w-fit">
                        {issue.path}
                      </span>
                    ) : null}
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          {plan.candidateFiles && plan.candidateFiles.length > 0 ? (
            <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm">
              <div className="border-b border-zinc-800/60 pb-4">
                <strong className="block text-base font-medium text-zinc-100">
                  Candidate files
                </strong>
                <p className="text-sm text-zinc-400 mt-1">
                  Files selected or inferred for the next patch proposal stage.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {plan.candidateFiles.map((file) => (
                  <article
                    className="flex flex-col gap-2 p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50 hover:border-zinc-700/80 transition-colors"
                    key={file.path}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <strong className="text-sm font-mono text-indigo-300 break-all">
                        {file.path}
                      </strong>
                      <Badge tone={file.existsKnown ? 'green' : 'slate'} className="shrink-0">
                        {file.existsKnown ? 'known' : 'inferred'}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">{file.reason}</p>
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          <div className="flex flex-col gap-4 mt-2">
            {plan.steps.map((step) => (
              <PlanStepCard step={step} key={step.id} />
            ))}
          </div>

          {plan.risks && plan.risks.length > 0 ? (
            <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm mt-2">
              <div className="border-b border-zinc-800/60 pb-4">
                <strong className="block text-base font-medium text-zinc-100">Risks</strong>
                <p className="text-sm text-zinc-400 mt-1">Runtime risk analysis for this plan.</p>
              </div>

              <div className="flex flex-col gap-3">
                {plan.risks.map((risk) => (
                  <article
                    className="flex flex-col gap-2 p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50"
                    key={risk.code}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <strong className="text-sm font-semibold text-zinc-200">{risk.code}</strong>
                      <RiskBadge risk={risk.level} />
                    </div>
                    <p className="text-sm text-zinc-300">{risk.message}</p>
                    <p className="text-xs text-zinc-500 mt-1">{risk.mitigation}</p>
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          {plan.verifyCommands && plan.verifyCommands.length > 0 ? (
            <article className="flex flex-col gap-5 p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-sm mt-2">
              <div className="border-b border-zinc-800/60 pb-4">
                <strong className="block text-base font-medium text-zinc-100">
                  Suggested verify commands
                </strong>
                <p className="text-sm text-zinc-400 mt-1">
                  These still require explicit approval before execution.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {plan.verifyCommands.map((verifyCommand) => (
                  <article
                    className="flex flex-col gap-3 p-4 rounded-lg border border-zinc-800/40 bg-zinc-950/50"
                    key={`${verifyCommand.command}-${verifyCommand.args.join('-')}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                      <strong className="text-sm font-mono text-indigo-300 break-all">
                        {verifyCommand.command} {verifyCommand.args.join(' ')}
                      </strong>
                      <Badge tone="yellow" className="shrink-0">
                        approval required
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-400">{verifyCommand.reason}</p>
                  </article>
                ))}
              </div>
            </article>
          ) : null}

          <PlanActions
            disabled={!session || !runtimePlan || runtimePlan.plan.status !== 'validated'}
            onApprovePlan={onApprovePlan}
            onRequestChanges={onRequestPlanChanges}
            onAddRestriction={onAddPlanRestriction}
            onViewContext={onViewPlanContext}
            onCancel={onCancelPlan}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 p-10 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 mt-4 min-h-75">
          <strong className="block text-base font-medium text-zinc-300">
            No runtime plan generated yet.
          </strong>
          <p className="text-sm text-zinc-500 max-w-md leading-relaxed">
            Generate a structured runtime plan from the current session goal.
          </p>
          <button
            disabled={!session || loading}
            onClick={onGeneratePlan}
            className="mt-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
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
