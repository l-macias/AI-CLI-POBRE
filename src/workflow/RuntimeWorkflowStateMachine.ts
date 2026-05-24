import type {
  RuntimeWorkflowArtifactState,
  RuntimeWorkflowState,
  RuntimeWorkflowStep,
  RuntimeWorkflowStepStatus,
} from './RuntimeWorkflowState.js';

export class RuntimeWorkflowStateMachine {
  public build(input: RuntimeWorkflowArtifactState): RuntimeWorkflowState {
    const snapshotRequired = input.riskLevel === 'medium' || input.riskLevel === 'high';

    const steps: RuntimeWorkflowStep[] = [
      {
        id: 'session',
        title: 'Session',
        description: 'Start a runtime-controlled session.',
        status: input.sessionStarted ? 'completed' : 'active',
        required: true,
      },
      {
        id: 'prepare_workflow',
        title: 'Prepare workflow',
        description: 'Analyze project context, routes, questions and verification commands.',
        status: this.statusAfter(input.sessionStarted, input.workflowPrepared),
        required: true,
        blockedReason: input.sessionStarted ? undefined : 'Session is required first.',
      },
      {
        id: 'runtime_plan',
        title: 'Runtime plan',
        description: 'Generate and validate a runtime plan.',
        status: this.validatedOrBlocked({
          canStart: input.workflowPrepared,
          valid: input.planValid,
          rejected: input.planRejected,
        }),
        required: true,
        blockedReason: input.planRejected ? 'Runtime plan validation failed.' : undefined,
      },
      {
        id: 'patch_proposal',
        title: 'Patch proposal',
        description: 'Generate and validate a patch proposal.',
        status: this.validatedOrBlocked({
          canStart: input.planValid,
          valid: input.patchProposalValid,
          rejected: input.patchProposalRejected,
        }),
        required: true,
        blockedReason: input.patchProposalRejected
          ? 'Patch proposal validation failed.'
          : undefined,
      },
      {
        id: 'diff_preview',
        title: 'Diff preview',
        description: 'Generate a safe diff preview before writes.',
        status: this.diffStatus(input),
        required: true,
        blockedReason: input.diffBlocked ? 'Diff preview is blocked.' : undefined,
      },
      {
        id: 'snapshot',
        title: 'Snapshot',
        description: snapshotRequired
          ? 'Snapshot is required before apply.'
          : 'Snapshot is optional but recommended.',
        status: this.snapshotStatus({
          diffReady: input.diffReady,
          snapshotAvailable: input.snapshotAvailable,
          snapshotRequired,
        }),
        required: snapshotRequired,
        blockedReason:
          snapshotRequired && input.diffReady && !input.snapshotAvailable
            ? 'Snapshot is required before apply.'
            : undefined,
      },
      {
        id: 'dry_run',
        title: 'Dry run',
        description: 'Validate apply without writing files.',
        status: this.statusAfter(input.diffReady, input.dryRunCompleted || input.applyApplied),
        required: true,
      },
      {
        id: 'apply',
        title: 'Apply',
        description: 'Apply patch with explicit confirmation and runtime gates.',
        status: this.applyStatus({
          diffReady: input.diffReady,
          snapshotAvailable: input.snapshotAvailable,
          snapshotRequired,
          applyApplied: input.applyApplied,
          applyBlocked: input.applyBlocked,
          applyFailed: input.applyFailed,
        }),
        required: true,
        blockedReason:
          input.applyBlocked || input.applyFailed
            ? 'Apply failed or was blocked by runtime policy.'
            : snapshotRequired && !input.snapshotAvailable
              ? 'Snapshot is required before apply.'
              : undefined,
      },
      {
        id: 'rollback',
        title: 'Rollback',
        description: 'Restore files from runtime backups when needed.',
        status: this.rollbackStatus(input),
        required: false,
        blockedReason:
          input.rollbackBlocked || input.rollbackFailed ? 'Rollback needs attention.' : undefined,
      },
      {
        id: 'verify',
        title: 'Verify',
        description: 'Run approved safe verification commands.',
        status: this.statusAfter(
          input.applyApplied || input.rollbackCompleted,
          input.verifyCompleted,
        ),
        required: false,
      },
      {
        id: 'report',
        title: 'Report',
        description: 'Export Markdown and JSON audit report.',
        status: this.statusAfter(
          input.dryRunCompleted ||
            input.applyApplied ||
            input.rollbackCompleted ||
            input.verifyCompleted,
          input.reportExported,
        ),
        required: true,
      },
    ];

    const completed = steps.filter((step) => step.status === 'completed').length;
    const current = steps.find(
      (step) =>
        step.status === 'active' || step.status === 'available' || step.status === 'blocked',
    );

    const blockedReasons = steps
      .map((step) => step.blockedReason)
      .filter((reason): reason is string => typeof reason === 'string' && reason.length > 0);

    return {
      steps,
      currentStepId: current?.id ?? 'report',
      completed,
      total: steps.length,
      percentage: Math.round((completed / steps.length) * 100),
      snapshotRequired,
      canContinue: !steps.some((step) => step.status === 'blocked' && step.required),
      blockedReasons,
    };
  }

  private statusAfter(canStart: boolean, completed: boolean): RuntimeWorkflowStepStatus {
    if (completed) {
      return 'completed';
    }

    if (canStart) {
      return 'available';
    }

    return 'locked';
  }

  private validatedOrBlocked(input: {
    canStart: boolean;
    valid: boolean;
    rejected: boolean;
  }): RuntimeWorkflowStepStatus {
    if (input.valid) {
      return 'completed';
    }

    if (input.rejected) {
      return 'blocked';
    }

    if (input.canStart) {
      return 'available';
    }

    return 'locked';
  }

  private diffStatus(input: RuntimeWorkflowArtifactState): RuntimeWorkflowStepStatus {
    if (input.diffReady) {
      return 'completed';
    }

    if (input.diffBlocked) {
      return 'blocked';
    }

    if (input.patchProposalValid) {
      return 'available';
    }

    return 'locked';
  }

  private snapshotStatus(input: {
    diffReady: boolean;
    snapshotAvailable: boolean;
    snapshotRequired: boolean;
  }): RuntimeWorkflowStepStatus {
    if (input.snapshotAvailable) {
      return 'completed';
    }

    if (!input.diffReady) {
      return 'locked';
    }

    return input.snapshotRequired ? 'active' : 'available';
  }

  private applyStatus(input: {
    diffReady: boolean;
    snapshotAvailable: boolean;
    snapshotRequired: boolean;
    applyApplied: boolean;
    applyBlocked: boolean;
    applyFailed: boolean;
  }): RuntimeWorkflowStepStatus {
    if (input.applyApplied) {
      return 'completed';
    }

    if (input.applyBlocked || input.applyFailed) {
      return 'blocked';
    }

    if (!input.diffReady) {
      return 'locked';
    }

    if (input.snapshotRequired && !input.snapshotAvailable) {
      return 'locked';
    }

    return 'available';
  }

  private rollbackStatus(input: RuntimeWorkflowArtifactState): RuntimeWorkflowStepStatus {
    if (input.rollbackCompleted) {
      return 'completed';
    }

    if (input.rollbackBlocked || input.rollbackFailed) {
      return 'blocked';
    }

    if (input.rollbackDryRunCompleted || input.applyApplied) {
      return 'available';
    }

    return 'locked';
  }
}
