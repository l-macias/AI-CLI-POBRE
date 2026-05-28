import type { RuntimeWorkflowState, RuntimeWorkflowStepId } from './RuntimeWorkflowState.js';

export type RuntimeWorkflowActionId =
  | 'start_session'
  | 'prepare_workflow'
  | 'generate_runtime_plan'
  | 'generate_patch_proposal'
  | 'generate_diff_preview'
  | 'create_snapshot'
  | 'verify_sandbox'
  | 'prepare_recovery'
  | 'generate_repaired_patch'
  | 'dry_run_apply'
  | 'apply_patch'
  | 'rollback_patch'
  | 'run_verify'
  | 'export_report'
  | 'none';

export interface RuntimeActionAvailability {
  actionId: RuntimeWorkflowActionId;
  title: string;
  description: string;
  enabled: boolean;
  blockedReason?: string | undefined;
  relatedStepId?: RuntimeWorkflowStepId | undefined;
}

export class RuntimeActionAvailabilityResolver {
  public resolve(state: RuntimeWorkflowState): RuntimeActionAvailability {
    const currentStep = state.steps.find((step) => step.id === state.currentStepId);

    if (!currentStep) {
      return this.none();
    }

    if (currentStep.status === 'blocked') {
      return {
        actionId: 'none',
        title: `${currentStep.title} blocked`,
        description: currentStep.blockedReason ?? 'Runtime workflow is blocked.',
        enabled: false,
        blockedReason: currentStep.blockedReason ?? 'Runtime workflow is blocked.',
        relatedStepId: currentStep.id,
      };
    }

    if (currentStep.status === 'locked') {
      return {
        actionId: 'none',
        title: `${currentStep.title} locked`,
        description: 'A previous workflow step must be completed first.',
        enabled: false,
        blockedReason: 'Previous workflow step is incomplete.',
        relatedStepId: currentStep.id,
      };
    }

    return this.actionForStep(currentStep.id);
  }

  private actionForStep(stepId: RuntimeWorkflowStepId): RuntimeActionAvailability {
    switch (stepId) {
      case 'session':
        return {
          actionId: 'start_session',
          title: 'Start session',
          description: 'Create a runtime-controlled session.',
          enabled: true,
          relatedStepId: stepId,
        };

      case 'prepare_workflow':
        return {
          actionId: 'prepare_workflow',
          title: 'Prepare workflow',
          description: 'Analyze project context and prepare safe workflow data.',
          enabled: true,
          relatedStepId: stepId,
        };

      case 'runtime_plan':
        return {
          actionId: 'generate_runtime_plan',
          title: 'Generate runtime plan',
          description: 'Create and validate a runtime plan.',
          enabled: true,
          relatedStepId: stepId,
        };

      case 'patch_proposal':
        return {
          actionId: 'generate_patch_proposal',
          title: 'Generate patch proposal',
          description: 'Create and validate a patch proposal.',
          enabled: true,
          relatedStepId: stepId,
        };

      case 'diff_preview':
        return {
          actionId: 'generate_diff_preview',
          title: 'Generate diff preview',
          description: 'Create a safe diff preview before applying changes.',
          enabled: true,
          relatedStepId: stepId,
        };

      case 'snapshot':
        return {
          actionId: 'create_snapshot',
          title: 'Create snapshot',
          description: 'Create a local rollback point.',
          enabled: true,
          relatedStepId: stepId,
        };

      case 'sandbox':
        return {
          actionId: 'verify_sandbox',
          title: 'Verify in sandbox',
          description: 'Run sandbox verification before real apply.',
          enabled: true,
          relatedStepId: stepId,
        };

      case 'recovery_prepare':
        return {
          actionId: 'prepare_recovery',
          title: 'Prepare recovery',
          description: 'Build recovery context from the failed sandbox result.',
          enabled: true,
          relatedStepId: stepId,
        };

      case 'repaired_patch':
        return {
          actionId: 'generate_repaired_patch',
          title: 'Generate repaired patch',
          description: 'Generate a repaired proposal after sandbox failure.',
          enabled: true,
          relatedStepId: stepId,
        };

      case 'dry_run':
        return {
          actionId: 'dry_run_apply',
          title: 'Dry run apply',
          description: 'Validate apply without writing files.',
          enabled: true,
          relatedStepId: stepId,
        };

      case 'apply':
        return {
          actionId: 'apply_patch',
          title: 'Apply patch',
          description: 'Apply patch after explicit confirmation and passed sandbox verification.',
          enabled: false,
          blockedReason: 'Real apply requires explicit confirmation in the UI.',
          relatedStepId: stepId,
        };

      case 'rollback':
        return {
          actionId: 'rollback_patch',
          title: 'Rollback patch',
          description: 'Rollback requires explicit confirmation in the UI.',
          enabled: false,
          blockedReason: 'Rollback requires explicit confirmation in the UI.',
          relatedStepId: stepId,
        };

      case 'verify':
        return {
          actionId: 'run_verify',
          title: 'Run verify',
          description: 'Run approved verification commands.',
          enabled: true,
          relatedStepId: stepId,
        };

      case 'report':
        return {
          actionId: 'export_report',
          title: 'Export report',
          description: 'Export the final workflow report.',
          enabled: true,
          relatedStepId: stepId,
        };

      default:
        return this.none();
    }
  }

  private none(): RuntimeActionAvailability {
    return {
      actionId: 'none',
      title: 'No action',
      description: 'No workflow action is currently available.',
      enabled: false,
    };
  }
}
