import type {
  CreateSnapshotResult,
  InteractiveSessionState,
  ReportExportResult,
  RuntimePatchApplyResult,
  RuntimePatchDiffGenerateResult,
  RuntimePatchProposalGenerateResult,
  RuntimePatchRollbackResult,
  RuntimePatchSandboxResult,
  RuntimePlanGenerateResult,
  RuntimePatchRecoveryResult,
  RuntimeWorkflowStateResponse,
} from '../../types/runtime';
import { NextBestActionPanel } from './NextBestActionPanel';
import { WorkflowProgressHeader } from './WorkflowProgressHeader';
import { WorkflowStepper } from './WorkflowStepper';
import { WorkflowHealthBadges } from './WorkflowHealthBadges';
import type {
  NextWorkflowAction,
  WorkflowProgressViewModel,
  WorkflowStepStatus,
  WorkflowStepViewModel,
} from './WorkflowTypes';

interface GuidedWorkflowPanelProps {
  session: InteractiveSessionState | null;
  runtimePlan: RuntimePlanGenerateResult | null;
  patchProposal: RuntimePatchProposalGenerateResult | null;
  patchDiff: RuntimePatchDiffGenerateResult | null;
  patchSandboxResult: RuntimePatchSandboxResult | null;
  patchRecoveryResult: RuntimePatchRecoveryResult | null;
  snapshot: CreateSnapshotResult | null;
  applyResult: RuntimePatchApplyResult | null;
  rollbackResult: RuntimePatchRollbackResult | null;
  reportExport: ReportExportResult | null;
  runtimeWorkflow: RuntimeWorkflowStateResponse | null;
  runtimeWorkflowLoading: boolean;
  onPrepareWorkflow: () => void;
  onGeneratePlan: () => void;
  onGenerateProviderPlan: () => void;
  onGeneratePatchProposal: () => void;
  onGeneratePatchDiff: () => void;
  onVerifySandbox: () => void;
  onPrepareRecovery: () => void;
  onGenerateRecoveryProposal: () => void;
  onDryRunApply: () => void;
  onCreateSnapshot: () => void;
  onExportReport: () => void;
}

export function GuidedWorkflowPanel(props: GuidedWorkflowPanelProps) {
  const runtimeWorkflow = props.runtimeWorkflow;
  const usingRuntimeWorkflow = runtimeWorkflow !== null;

  const workflow = runtimeWorkflow
    ? toWorkflowProgressViewModel(runtimeWorkflow.workflow)
    : buildWorkflowProgress(props);

  const action = runtimeWorkflow
    ? toNextWorkflowAction({
        nextAction: runtimeWorkflow.nextAction,
        input: props,
      })
    : buildNextAction(props);

  return (
    <section className="flex flex-col gap-6 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 shadow-sm">
      <WorkflowProgressHeader workflow={workflow} />

      <NextBestActionPanel action={action} />

      <details className="group border border-zinc-800/60 rounded-xl bg-zinc-950/30">
        <summary className="cursor-pointer p-4 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors select-none">
          Show advanced workflow details
        </summary>

        <div className="flex flex-col gap-6 p-4 pt-0">
          <WorkflowHealthBadges
            runtimePlan={props.runtimePlan}
            patchProposal={props.patchProposal}
            patchDiff={props.patchDiff}
            patchSandboxResult={props.patchSandboxResult}
            patchRecoveryResult={props.patchRecoveryResult}
            applyResult={props.applyResult}
            rollbackResult={props.rollbackResult}
          />

          <div className="flex flex-col gap-2 p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 font-mono">
            <span>
              Runtime source:{' '}
              <strong className="text-zinc-200">
                {usingRuntimeWorkflow ? 'state machine' : 'local fallback'}
              </strong>
            </span>
            {props.runtimeWorkflowLoading ? (
              <span className="animate-pulse text-indigo-400">Refreshing workflow state...</span>
            ) : null}
          </div>

          <WorkflowStepper workflow={workflow} />
        </div>
      </details>
    </section>
  );
}

function buildWorkflowProgress(input: GuidedWorkflowPanelProps): WorkflowProgressViewModel {
  const snapshotRequired = requiresSnapshot(input);
  const snapshotReady = input.snapshot !== null;
  const sandboxPassed = input.patchSandboxResult?.status === 'passed';
  const sandboxBlocked =
    input.patchSandboxResult?.status === 'blocked' || input.patchSandboxResult?.status === 'failed';
  const applyCompleted = input.applyResult?.status === 'applied';
  const rollbackCompleted = input.rollbackResult?.status === 'rolled_back';
  const dryRunCompleted = input.applyResult?.status === 'dry_run' || applyCompleted;

  const steps: WorkflowStepViewModel[] = [
    {
      id: 'session',
      title: 'Session',
      description: 'Start a controlled runtime session for the selected project.',
      status: input.session ? 'completed' : 'active',
      targetPanelId: 'session-start-panel',
    },
    {
      id: 'workflow',
      title: 'Prepare workflow',
      description:
        'Analyze stack, routes, frontend/backend links, questions and safe verify scripts.',
      status: statusAfter(
        input.session !== null,
        hasRuntimeAction(input.session, 'workflow prepared'),
      ),
      reason: !input.session ? 'Start a session first.' : undefined,
      targetPanelId: 'project-intelligence-panel',
    },
    {
      id: 'plan',
      title: 'Runtime plan',
      description: 'Generate a validated runtime plan before patch proposal.',
      status: statusAfter(input.session !== null, input.runtimePlan?.validation.valid === true),
      reason:
        input.runtimePlan?.validation.valid === false ? 'Runtime plan is rejected.' : undefined,
      targetPanelId: 'runtime-plan-panel',
    },
    {
      id: 'patch',
      title: 'Patch proposal',
      description: 'Generate a patch proposal from the validated runtime plan.',
      status: statusAfter(
        input.runtimePlan?.validation.valid === true,
        input.patchProposal?.validation.valid === true,
      ),
      reason:
        input.patchProposal?.validation.valid === false ? 'Patch proposal is rejected.' : undefined,
      targetPanelId: 'runtime-patch-panel',
    },
    {
      id: 'diff',
      title: 'Diff preview',
      description: 'Build a preview before any write is allowed.',
      status: statusAfter(
        input.patchProposal?.validation.valid === true,
        input.patchDiff?.diff.safeToPreview === true,
      ),
      reason:
        input.patchDiff && !input.patchDiff.diff.safeToPreview
          ? 'Diff preview is not safe.'
          : undefined,
      targetPanelId: 'runtime-patch-panel',
    },
    {
      id: 'snapshot',
      title: 'Snapshot',
      description: snapshotRequired
        ? 'Snapshot is required before real apply for this risk level.'
        : 'Snapshot is optional for this low-risk patch, but still recommended.',
      status: snapshotStatus({
        diffReady: input.patchDiff?.diff.safeToPreview === true,
        snapshotReady,
        snapshotRequired,
      }),
      reason:
        input.patchDiff?.diff.safeToPreview !== true
          ? 'Generate a safe diff preview first.'
          : snapshotRequired && !snapshotReady
            ? 'Required before real apply.'
            : undefined,
      targetPanelId: 'snapshot-panel',
    },
    {
      id: 'verify',
      title: 'Sandbox verification',
      description: 'Apply patch in sandbox and run approved verify commands before real apply.',
      status: sandboxStatus({
        diffReady: input.patchDiff?.diff.safeToPreview === true,
        sandboxPassed,
        sandboxBlocked,
      }),
      reason:
        input.patchDiff?.diff.safeToPreview !== true
          ? 'Generate a safe diff preview first.'
          : sandboxBlocked
            ? 'Sandbox verification failed or was blocked.'
            : undefined,
      targetPanelId: 'runtime-patch-panel',
    },
    {
      id: 'dry-run',
      title: 'Dry run',
      description: 'Validate controlled apply without writing files.',
      status: statusAfter(
        input.patchDiff?.diff.safeToPreview === true && !sandboxBlocked,
        dryRunCompleted,
      ),
      targetPanelId: 'runtime-patch-panel',
    },
    {
      id: 'apply',
      title: 'Apply',
      description: 'Apply only after explicit confirmation and runtime gates.',
      status: applyStatus({
        diffReady: input.patchDiff?.diff.safeToPreview === true,
        snapshotReady,
        snapshotRequired,
        sandboxBlocked,
        applyCompleted,
        applyResult: input.applyResult,
      }),
      reason: sandboxBlocked
        ? 'Sandbox verification must pass before real apply.'
        : snapshotRequired && !snapshotReady
          ? 'Snapshot required before real apply.'
          : input.applyResult?.status === 'blocked'
            ? 'Apply was blocked by runtime policy.'
            : undefined,
      targetPanelId: 'runtime-patch-panel',
    },
    {
      id: 'rollback',
      title: 'Rollback',
      description: 'Restore from runtime backups if needed.',
      status: rollbackCompleted
        ? 'completed'
        : input.rollbackResult?.status === 'dry_run'
          ? 'available'
          : input.rollbackResult?.status === 'blocked' || input.rollbackResult?.status === 'failed'
            ? 'blocked'
            : applyCompleted
              ? 'available'
              : 'locked',
      reason:
        input.rollbackResult?.status === 'dry_run'
          ? 'Rollback dry-run completed. Real rollback requires explicit confirmation in the Patch panel.'
          : input.rollbackResult?.status === 'blocked' || input.rollbackResult?.status === 'failed'
            ? 'Rollback needs attention.'
            : !applyCompleted
              ? 'Apply must complete before rollback is available.'
              : undefined,
      targetPanelId: 'runtime-patch-panel',
    },
    {
      id: 'report',
      title: 'Report',
      description: 'Export Markdown and JSON audit report.',
      status: input.reportExport
        ? 'completed'
        : input.applyResult || input.rollbackResult
          ? 'available'
          : 'locked',
      reason:
        !input.applyResult && !input.rollbackResult
          ? 'Run at least dry-run/apply or rollback before final report.'
          : undefined,
      targetPanelId: 'report-export-panel',
    },
  ];

  const completed = steps.filter((step) => step.status === 'completed').length;
  const active = steps.find(
    (step) => step.status === 'active' || step.status === 'available' || step.status === 'blocked',
  );

  return {
    steps,
    completed,
    total: steps.length,
    percentage: Math.round((completed / steps.length) * 100),
    currentStepTitle: active?.title ?? 'Workflow complete',
  };
}

function buildNextAction(input: GuidedWorkflowPanelProps): NextWorkflowAction {
  const snapshotRequired = requiresSnapshot(input);
  const snapshotReady = input.snapshot !== null;
  const sandboxBlocked =
    input.patchSandboxResult?.status === 'blocked' || input.patchSandboxResult?.status === 'failed';

  if (!input.session) {
    return {
      title: 'Start a session',
      description: 'Create a runtime session before guided workflow actions are available.',
      buttonLabel: 'Waiting for session',
      disabled: true,
      blockedReason: 'Use the Start session form first.',
      onRun: () => undefined,
    };
  }

  if (!hasRuntimeAction(input.session, 'workflow prepared')) {
    return {
      title: 'Prepare the project',
      description:
        'Zero will inspect the stack, routes, frontend/backend links, questions and safe verify scripts.',
      buttonLabel: 'Prepare Project',
      disabled: false,
      onRun: input.onPrepareWorkflow,
    };
  }

  if (!input.runtimePlan) {
    return {
      title: 'Create the implementation plan',
      description:
        'Generate a controlled plan before any patch exists. This keeps the runtime in charge.',
      buttonLabel: 'Create Plan',
      secondaryButtonLabel: 'Generate with Provider',
      disabled: false,
      onRun: input.onGeneratePlan,
      onRunSecondary: input.onGenerateProviderPlan,
    };
  }

  if (!input.runtimePlan.validation.valid) {
    return blockedAction('Runtime plan blocked', 'Runtime plan validation failed.');
  }

  if (!input.patchProposal) {
    return {
      title: 'Create the patch proposal',
      description:
        'Turn the approved plan into a reviewable patch proposal. No files will be written yet.',
      buttonLabel: 'Create Patch',
      disabled: false,
      onRun: input.onGeneratePatchProposal,
    };
  }

  if (!input.patchProposal.validation.valid) {
    return blockedAction('Patch proposal blocked', 'Patch proposal validation failed.');
  }

  if (!input.patchDiff) {
    return {
      title: 'Preview the changes',
      description: 'Generate the diff so you can inspect exactly what would change.',
      buttonLabel: 'Preview Diff',
      disabled: false,
      onRun: input.onGeneratePatchDiff,
    };
  }

  if (!input.patchDiff.diff.safeToPreview) {
    return blockedAction('Diff preview blocked', 'Diff is not safe to preview.');
  }

  if (snapshotRequired && !snapshotReady) {
    return {
      title: 'Create required snapshot',
      description: 'This patch risk level requires a snapshot before real apply.',
      buttonLabel: 'Create Snapshot',
      disabled: false,
      onRun: input.onCreateSnapshot,
    };
  }

  if (!input.patchSandboxResult) {
    return {
      title: 'Test safely in sandbox',
      description: 'Zero will apply the patch in an isolated workspace and run verification there.',
      buttonLabel: 'Run Sandbox Test',
      disabled: false,
      onRun: input.onVerifySandbox,
    };
  }

  if (sandboxBlocked) {
    if (!input.patchRecoveryResult) {
      return {
        title: 'Prepare recovery',
        description:
          'Sandbox verification failed or was blocked. Prepare a recovery report before generating a repaired patch.',
        buttonLabel: 'Prepare Recovery',
        disabled: false,
        onRun: input.onPrepareRecovery,
      };
    }

    if (input.patchRecoveryResult.status === 'repair_prompt_ready') {
      return {
        title: 'Generate repaired patch',
        description:
          'Recovery context is ready. Generate a repaired proposal, then review a new diff and run sandbox again.',
        buttonLabel: 'Generate Repaired Patch',
        disabled: false,
        onRun: input.onGenerateRecoveryProposal,
      };
    }

    if (input.patchRecoveryResult.status === 'max_attempts_reached') {
      return blockedAction(
        'Recovery attempts exhausted',
        'Maximum recovery attempts were reached. Manual review is required.',
      );
    }

    return blockedAction(
      'Patch is not recoverable',
      'Runtime marked this failed sandbox result as not recoverable.',
    );
  }

  if (!input.applyResult) {
    return {
      title: 'Run a final dry-run',
      description: 'Check the apply path one more time without writing files.',
      buttonLabel: 'Run Dry-Run',
      disabled: false,
      onRun: input.onDryRunApply,
    };
  }

  if (input.applyResult.status === 'dry_run') {
    return {
      title: 'Ready for controlled apply',
      description: 'Use the Patch panel to type APPLY and perform the controlled write.',
      buttonLabel: 'Use Patch Panel',
      disabled: true,
      blockedReason: 'Real apply requires explicit text confirmation inside the Patch panel.',
      onRun: () => undefined,
    };
  }

  if (input.applyResult.status === 'blocked') {
    return blockedAction('Apply blocked', 'Runtime policy blocked the apply action.');
  }

  if (input.applyResult.status === 'failed') {
    return blockedAction('Apply failed', 'Review apply issues before continuing.');
  }

  if (input.applyResult.status === 'applied' && !input.rollbackResult) {
    return {
      title: 'Rollback is available',
      description: 'Patch was applied. Rollback can be dry-run or executed from the Patch panel.',
      buttonLabel: 'Use Patch Panel',
      disabled: true,
      blockedReason: 'Rollback requires explicit text confirmation inside the Patch panel.',
      onRun: () => undefined,
    };
  }

  if (input.rollbackResult?.status === 'dry_run') {
    return {
      title: 'Rollback dry-run completed',
      description: 'Use the Patch panel to type ROLLBACK and restore files from backups.',
      buttonLabel: 'Use Patch Panel',
      disabled: true,
      blockedReason: 'Real rollback requires explicit text confirmation inside the Patch panel.',
      onRun: () => undefined,
    };
  }

  if (input.rollbackResult?.status === 'blocked' || input.rollbackResult?.status === 'failed') {
    return blockedAction(
      'Rollback needs attention',
      'Review rollback issues before exporting final report.',
    );
  }

  if (!input.reportExport && (input.applyResult || input.rollbackResult)) {
    return {
      title: 'Export the session report',
      description: 'Save Markdown and JSON evidence for what Zero proposed, blocked and applied.',
      buttonLabel: 'Export Report',
      disabled: false,
      onRun: input.onExportReport,
    };
  }

  return {
    title: 'Workflow complete',
    description: 'The guided workflow has reached a complete state.',
    buttonLabel: 'Complete',
    disabled: true,
    onRun: () => undefined,
  };
}

function blockedAction(title: string, reason: string): NextWorkflowAction {
  return {
    title,
    description: reason,
    buttonLabel: 'Blocked',
    disabled: true,
    blockedReason: reason,
    onRun: () => undefined,
  };
}

function statusAfter(canStart: boolean, completed: boolean): WorkflowStepStatus {
  if (completed) {
    return 'completed';
  }

  if (canStart) {
    return 'available';
  }

  return 'locked';
}

function snapshotStatus(input: {
  diffReady: boolean;
  snapshotReady: boolean;
  snapshotRequired: boolean;
}): WorkflowStepStatus {
  if (input.snapshotReady) {
    return 'completed';
  }

  if (!input.diffReady) {
    return 'locked';
  }

  if (input.snapshotRequired) {
    return 'active';
  }

  return 'available';
}

function sandboxStatus(input: {
  diffReady: boolean;
  sandboxPassed: boolean;
  sandboxBlocked: boolean;
}): WorkflowStepStatus {
  if (input.sandboxPassed) {
    return 'completed';
  }

  if (input.sandboxBlocked) {
    return 'blocked';
  }

  if (!input.diffReady) {
    return 'locked';
  }

  return 'available';
}

function applyStatus(input: {
  diffReady: boolean;
  snapshotReady: boolean;
  snapshotRequired: boolean;
  sandboxBlocked: boolean;
  applyCompleted: boolean;
  applyResult: RuntimePatchApplyResult | null;
}): WorkflowStepStatus {
  if (input.applyCompleted) {
    return 'completed';
  }

  if (
    input.sandboxBlocked ||
    input.applyResult?.status === 'blocked' ||
    input.applyResult?.status === 'failed'
  ) {
    return 'blocked';
  }

  if (!input.diffReady) {
    return 'locked';
  }

  if (input.snapshotRequired && !input.snapshotReady) {
    return 'locked';
  }

  return 'available';
}

function requiresSnapshot(input: GuidedWorkflowPanelProps): boolean {
  const risk = input.patchProposal?.proposal.riskLevel ?? input.runtimePlan?.plan.riskLevel;

  return risk === 'medium' || risk === 'high';
}

function hasRuntimeAction(session: InteractiveSessionState | null, needle: string): boolean {
  if (!session) {
    return false;
  }

  const normalizedNeedle = needle.toLowerCase();

  return session.runtimeActions.some((action) =>
    `${action.title} ${action.description}`.toLowerCase().includes(normalizedNeedle),
  );
}

function toWorkflowProgressViewModel(
  workflow: RuntimeWorkflowStateResponse['workflow'],
): WorkflowProgressViewModel {
  const steps: WorkflowStepViewModel[] = workflow.steps.map((step) => ({
    id: step.id,
    title: step.title,
    description: step.description,
    status: step.status,
    reason: step.blockedReason,
    targetPanelId: targetPanelIdForStep(step.id),
  }));

  const currentStep = workflow.steps.find((step) => step.id === workflow.currentStepId);

  return {
    steps,
    completed: workflow.completed,
    total: workflow.total,
    percentage: workflow.percentage,
    currentStepTitle: currentStep?.title ?? 'Workflow complete',
  };
}

function toNextWorkflowAction(input: {
  nextAction: RuntimeWorkflowStateResponse['nextAction'];
  input: GuidedWorkflowPanelProps;
}): NextWorkflowAction {
  const nextAction = input.nextAction;

  if (!nextAction.enabled) {
    return {
      title: nextAction.title,
      description: nextAction.description,
      buttonLabel: nextAction.actionId === 'none' ? 'Blocked' : nextAction.title,
      disabled: true,
      blockedReason: nextAction.blockedReason,
      onRun: () => undefined,
    };
  }

  return {
    title: nextAction.title,
    description: nextAction.description,
    buttonLabel: buttonLabelForRuntimeAction(nextAction.actionId),
    disabled: false,
    onRun: handlerForRuntimeAction({
      actionId: nextAction.actionId,
      input: input.input,
    }),
    ...(nextAction.actionId === 'generate_runtime_plan'
      ? {
          secondaryButtonLabel: 'Generate with Provider',
          onRunSecondary: input.input.onGenerateProviderPlan,
        }
      : {}),
  };
}

function buttonLabelForRuntimeAction(
  actionId: RuntimeWorkflowStateResponse['nextAction']['actionId'],
): string {
  switch (actionId) {
    case 'prepare_workflow':
      return 'Prepare Workflow';
    case 'generate_runtime_plan':
      return 'Generate Runtime Plan';
    case 'generate_patch_proposal':
      return 'Generate Patch Proposal';
    case 'generate_diff_preview':
      return 'Generate Diff Preview';
    case 'create_snapshot':
      return 'Create Snapshot';
    case 'verify_sandbox':
      return 'Verify in Sandbox';
    case 'prepare_recovery':
      return 'Prepare Recovery';
    case 'generate_repaired_patch':
      return 'Generate Repaired Patch';
    case 'dry_run_apply':
      return 'Dry Run Apply';
    case 'run_verify':
      return 'Run Verify';
    case 'export_report':
      return 'Export Report';
    case 'start_session':
      return 'Start Session';
    case 'apply_patch':
      return 'Use Patch Panel';
    case 'rollback_patch':
      return 'Use Patch Panel';
    default:
      return 'Unavailable';
  }
}

function handlerForRuntimeAction(input: {
  actionId: RuntimeWorkflowStateResponse['nextAction']['actionId'];
  input: GuidedWorkflowPanelProps;
}): () => void {
  switch (input.actionId) {
    case 'prepare_workflow':
      return input.input.onPrepareWorkflow;
    case 'generate_runtime_plan':
      return input.input.onGeneratePlan;
    case 'generate_patch_proposal':
      return input.input.onGeneratePatchProposal;
    case 'generate_diff_preview':
      return input.input.onGeneratePatchDiff;
    case 'create_snapshot':
      return input.input.onCreateSnapshot;
    case 'verify_sandbox':
      return input.input.onVerifySandbox;
    case 'prepare_recovery':
      return input.input.onPrepareRecovery;
    case 'generate_repaired_patch':
      return input.input.onGenerateRecoveryProposal;
    case 'dry_run_apply':
      return input.input.onDryRunApply;
    case 'export_report':
      return input.input.onExportReport;
    default:
      return () => undefined;
  }
}

function targetPanelIdForStep(
  stepId: RuntimeWorkflowStateResponse['workflow']['currentStepId'],
): string | undefined {
  switch (stepId) {
    case 'session':
      return 'session-start-panel';
    case 'prepare_workflow':
      return 'project-intelligence-panel';
    case 'runtime_plan':
      return 'runtime-plan-panel';
    case 'patch_proposal':
    case 'diff_preview':
    case 'sandbox':
    case 'recovery_prepare':
    case 'repaired_patch':
    case 'dry_run':
    case 'apply':
    case 'rollback':
      return 'runtime-patch-panel';
    case 'snapshot':
      return 'snapshot-panel';
    case 'verify':
      return 'verify-panel';
    case 'report':
      return 'report-export-panel';
    default:
      return undefined;
  }
}
