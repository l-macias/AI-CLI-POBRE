import type {
  RuntimeWorkflowArtifactState,
  RuntimeWorkflowState,
  RuntimeWorkflowStep,
  RuntimeWorkflowStepStatus,
} from './RuntimeWorkflowState.js';

export class RuntimeWorkflowStateMachine {
  public build(input: RuntimeWorkflowArtifactState): RuntimeWorkflowState {
    if (input.planMode === 'read_only') {
      return this.buildReadOnlyWorkflow(input);
    }

    return this.buildPatchWorkflow(input);
  }

  private buildReadOnlyWorkflow(input: RuntimeWorkflowArtifactState): RuntimeWorkflowState {
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
        id: 'runtime_questions',
        title: 'Runtime questions',
        description: 'Answer high-priority runtime questions before generating the analysis plan.',
        status: this.questionsStatus(input),
        required: input.pendingHighPriorityQuestionCount > 0,
        blockedReason:
          input.pendingHighPriorityQuestionCount > 0 && !input.planValid
            ? `${input.pendingHighPriorityQuestionCount} high-priority question(s) should be answered before planning.`
            : undefined,
      },
      {
        id: 'runtime_plan',
        title: 'Read-only plan',
        description: 'Generate and validate a read-only analysis plan.',
        status: this.validatedOrBlocked({
          canStart: input.workflowPrepared && this.questionsResolved(input),
          valid: input.planValid,
          rejected: input.planRejected,
        }),
        required: true,
        blockedReason: input.planRejected ? 'Runtime plan validation failed.' : undefined,
      },
      {
        id: 'report',
        title: 'Report',
        description: 'Export Markdown and JSON read-only analysis report.',
        status: this.statusAfter(input.planValid, input.reportExported),
        required: true,
      },
    ];

    return this.finalizeWorkflow({
      steps,
      snapshotRequired: false,
    });
  }

  private buildPatchWorkflow(input: RuntimeWorkflowArtifactState): RuntimeWorkflowState {
    const snapshotRequired = input.riskLevel === 'medium' || input.riskLevel === 'high';

    const sandboxNeedsRecovery =
      input.sandboxFailed || input.sandboxBlocked || input.recoveryAvailable;

    const patchReadyForDiff = input.patchProposalValid || input.repairedProposalGenerated;

    const diffReadyForApply = input.diffReady && input.sandboxPassed;

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
        id: 'runtime_questions',
        title: 'Runtime questions',
        description:
          'Answer high-priority runtime questions before generating the implementation plan.',
        status: this.questionsStatus(input),
        required: input.pendingHighPriorityQuestionCount > 0,
        blockedReason:
          input.pendingHighPriorityQuestionCount > 0 && !input.planValid
            ? `${input.pendingHighPriorityQuestionCount} high-priority question(s) should be answered before planning.`
            : undefined,
      },
      {
        id: 'runtime_plan',
        title: 'Runtime plan',
        description: 'Generate and validate a runtime plan.',
        status: this.validatedOrBlocked({
          canStart: input.workflowPrepared && this.questionsResolved(input),
          valid: input.planValid,
          rejected: input.planRejected,
        }),
        required: true,
        blockedReason: input.planRejected ? 'Runtime plan validation failed.' : undefined,
      },
      {
        id: 'patch_proposal',
        title: 'Patch proposal',
        description: input.repairedProposalGenerated
          ? 'A repaired patch proposal was generated after recovery.'
          : 'Generate and validate a patch proposal.',
        status: this.patchProposalStatus(input),
        required: true,
        blockedReason: input.patchProposalRejected
          ? 'Patch proposal validation failed.'
          : undefined,
      },
      {
        id: 'diff_preview',
        title: 'Diff preview',
        description: input.repairedProposalGenerated
          ? 'Generate a new diff preview for the repaired patch proposal.'
          : 'Generate a safe diff preview before writes.',
        status: this.diffStatus({
          canStart: patchReadyForDiff,
          diffReady: input.diffReady,
          diffBlocked: input.diffBlocked,
        }),
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
        id: 'sandbox',
        title: 'Sandbox verification',
        description: 'Verify the patch in an isolated sandbox before real apply.',
        status: this.sandboxStatus(input),
        required: true,
        blockedReason: this.sandboxBlockedReason(input),
      },
      {
        id: 'recovery_prepare',
        title: 'Prepare recovery',
        description: 'Build a failure report and recovery context after sandbox failure.',
        status: this.recoveryPrepareStatus(input),
        required: sandboxNeedsRecovery,
        blockedReason: input.recoveryMaxAttemptsReached
          ? 'Maximum recovery attempts reached.'
          : undefined,
      },
      {
        id: 'repaired_patch',
        title: 'Generate repaired patch',
        description: 'Ask the provider to generate a repaired patch proposal.',
        status: this.repairedPatchStatus(input),
        required: sandboxNeedsRecovery,
        blockedReason: input.recoveryMaxAttemptsReached
          ? 'Maximum recovery attempts reached.'
          : undefined,
      },
      {
        id: 'dry_run',
        title: 'Dry run',
        description: 'Validate apply without writing files.',
        status: this.statusAfter(diffReadyForApply, input.dryRunCompleted || input.applyApplied),
        required: true,
        blockedReason:
          !input.sandboxPassed && input.diffReady
            ? 'Sandbox verification must pass before dry-run apply.'
            : undefined,
      },
      {
        id: 'apply',
        title: 'Apply',
        description: 'Apply patch with explicit confirmation, approval and sandbox gates.',
        status: this.applyStatus({
          diffReady: input.diffReady,
          sandboxPassed: input.sandboxPassed,
          snapshotAvailable: input.snapshotAvailable,
          snapshotRequired,
          applyApplied: input.applyApplied,
          applyBlocked: input.applyBlocked,
          applyFailed: input.applyFailed,
        }),
        required: true,
        blockedReason: this.applyBlockedReason({
          input,
          snapshotRequired,
        }),
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
            input.verifyCompleted ||
            input.sandboxPassed ||
            input.repairedProposalGenerated,
          input.reportExported,
        ),
        required: true,
      },
    ];

    return this.finalizeWorkflow({
      steps,
      snapshotRequired,
    });
  }

  private finalizeWorkflow(input: {
    steps: RuntimeWorkflowStep[];
    snapshotRequired: boolean;
  }): RuntimeWorkflowState {
    const completed = input.steps.filter((step) => step.status === 'completed').length;
    const current =
      input.steps.find((step) => step.status === 'active' || step.status === 'available') ??
      input.steps.find((step) => step.status === 'blocked');

    const blockedReasons = input.steps
      .map((step) => step.blockedReason)
      .filter((reason): reason is string => typeof reason === 'string' && reason.length > 0);

    return {
      steps: input.steps,
      currentStepId: current?.id ?? 'report',
      completed,
      total: input.steps.length,
      percentage: Math.round((completed / input.steps.length) * 100),
      snapshotRequired: input.snapshotRequired,
      canContinue: !input.steps.some((step) => step.status === 'blocked' && step.required),
      blockedReasons,
    };
  }
  private questionsResolved(input: RuntimeWorkflowArtifactState): boolean {
    return input.pendingHighPriorityQuestionCount === 0 || input.planValid;
  }

  private questionsStatus(input: RuntimeWorkflowArtifactState): RuntimeWorkflowStepStatus {
    if (!input.workflowPrepared) {
      return 'locked';
    }

    if (input.pendingHighPriorityQuestionCount === 0 || input.planValid) {
      return 'completed';
    }

    return 'available';
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

  private patchProposalStatus(input: RuntimeWorkflowArtifactState): RuntimeWorkflowStepStatus {
    if (input.patchProposalValid || input.repairedProposalGenerated) {
      return 'completed';
    }

    if (input.patchProposalRejected) {
      return 'blocked';
    }

    if (input.planValid) {
      return 'available';
    }

    return 'locked';
  }

  private diffStatus(input: {
    canStart: boolean;
    diffReady: boolean;
    diffBlocked: boolean;
  }): RuntimeWorkflowStepStatus {
    if (input.diffReady) {
      return 'completed';
    }

    if (input.diffBlocked) {
      return 'blocked';
    }

    if (input.canStart) {
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

  private sandboxStatus(input: RuntimeWorkflowArtifactState): RuntimeWorkflowStepStatus {
    if (input.sandboxPassed) {
      return 'completed';
    }

    if (input.recoveryMaxAttemptsReached) {
      return 'blocked';
    }

    if (input.sandboxFailed || input.sandboxBlocked) {
      return 'blocked';
    }

    if (input.diffReady) {
      return 'available';
    }

    return 'locked';
  }

  private sandboxBlockedReason(input: RuntimeWorkflowArtifactState): string | undefined {
    if (input.recoveryMaxAttemptsReached) {
      return 'Maximum recovery attempts reached.';
    }

    if (input.sandboxBlocked) {
      return 'Sandbox verification was blocked by runtime policy.';
    }

    if (input.sandboxFailed) {
      return 'Sandbox verification failed. Recovery is required before apply.';
    }

    return undefined;
  }

  private recoveryPrepareStatus(input: RuntimeWorkflowArtifactState): RuntimeWorkflowStepStatus {
    if (
      input.sandboxPassed &&
      !input.recoveryAvailable &&
      !input.sandboxFailed &&
      !input.sandboxBlocked
    ) {
      return 'completed';
    }

    if (input.recoveryPrepared) {
      return 'completed';
    }

    if (input.recoveryMaxAttemptsReached) {
      return 'blocked';
    }

    if (input.sandboxFailed || input.sandboxBlocked || input.recoveryAvailable) {
      return 'available';
    }

    return 'locked';
  }

  private repairedPatchStatus(input: RuntimeWorkflowArtifactState): RuntimeWorkflowStepStatus {
    if (
      input.sandboxPassed &&
      !input.recoveryAvailable &&
      !input.sandboxFailed &&
      !input.sandboxBlocked
    ) {
      return 'completed';
    }

    if (input.repairedProposalGenerated) {
      return 'completed';
    }

    if (input.recoveryMaxAttemptsReached) {
      return 'blocked';
    }

    if (input.recoveryPrepared) {
      return 'available';
    }

    return 'locked';
  }

  private applyStatus(input: {
    diffReady: boolean;
    sandboxPassed: boolean;
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

    if (!input.sandboxPassed) {
      return 'locked';
    }

    if (input.snapshotRequired && !input.snapshotAvailable) {
      return 'locked';
    }

    return 'available';
  }

  private applyBlockedReason(input: {
    input: RuntimeWorkflowArtifactState;
    snapshotRequired: boolean;
  }): string | undefined {
    if (input.input.applyBlocked || input.input.applyFailed) {
      return 'Apply failed or was blocked by runtime policy.';
    }

    if (input.input.diffReady && !input.input.sandboxPassed) {
      return 'Sandbox verification must pass before real apply.';
    }

    if (input.snapshotRequired && !input.input.snapshotAvailable) {
      return 'Snapshot is required before apply.';
    }

    return undefined;
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
