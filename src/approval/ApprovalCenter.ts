import type {
  ApprovalAction,
  ApprovalCenterArtifactState,
  ApprovalCenterResult,
  ApprovalChecklistItem,
  ApprovalDecisionInput,
  ApprovalDecisionResult,
  ApprovalRequest,
  ApprovalRiskLevel,
} from './ApprovalRequest.js';

export class ApprovalCenter {
  public build(input: ApprovalCenterArtifactState): ApprovalCenterResult {
    const generatedAt = new Date().toISOString();
    const requests: ApprovalRequest[] = [
      ...this.buildPlanRequests(input, generatedAt),
      ...this.buildPatchRequests(input, generatedAt),
      ...this.buildVerifyRequests(input, generatedAt),
      ...this.buildDirtyWorkingTreeRequests(input, generatedAt),
      ...this.buildRollbackRequests(input, generatedAt),
    ];

    return {
      sessionId: input.sessionId,
      projectRoot: input.projectRoot,
      pendingCount: requests.filter((request) => request.status === 'pending').length,
      highestRisk: this.highestRisk(requests),
      requests,
      generatedAt,
    };
  }

  public decide(
    center: ApprovalCenterResult,
    input: ApprovalDecisionInput,
  ): ApprovalDecisionResult {
    const request = center.requests.find((candidate) => candidate.id === input.requestId);

    if (!request) {
      return {
        requestId: input.requestId,
        action: input.action,
        accepted: false,
        blockedReason: 'Approval request was not found.',
        selectedFilePaths: [],
        decidedAt: new Date().toISOString(),
      };
    }

    const action = request.actions.find((candidate) => candidate.kind === input.action);

    if (!action) {
      return {
        requestId: input.requestId,
        action: input.action,
        accepted: false,
        blockedReason: 'Approval action is not supported for this request.',
        selectedFilePaths: [],
        decidedAt: new Date().toISOString(),
      };
    }

    if (!action.enabled) {
      return {
        requestId: input.requestId,
        action: input.action,
        accepted: false,
        blockedReason: action.blockedReason ?? 'Approval action is blocked.',
        selectedFilePaths: [],
        decidedAt: new Date().toISOString(),
      };
    }

    const selectedFilePaths = this.normalizeSelectedFiles({
      action: input.action,
      availableFilePaths: request.filePaths,
      selectedFilePaths: input.selectedFilePaths,
    });

    return {
      requestId: input.requestId,
      action: input.action,
      accepted: true,
      selectedFilePaths,
      ...(input.reason ? { reason: input.reason } : {}),
      decidedAt: new Date().toISOString(),
    };
  }

  private buildPlanRequests(
    input: ApprovalCenterArtifactState,
    createdAt: string,
  ): ApprovalRequest[] {
    if (!input.plan || !input.plan.requiresApproval || input.plan.status !== 'validated') {
      return [];
    }

    return [
      {
        id: `approval-plan-${input.plan.id}`,
        sessionId: input.sessionId,
        kind: 'plan',
        title: 'Approve runtime plan',
        description: input.plan.scope.summary,
        riskLevel: input.plan.riskLevel,
        status: 'pending',
        target: {
          type: 'plan',
          id: input.plan.id,
        },
        checklist: [
          this.passed(
            'runtime-authority',
            'Runtime authority',
            'Plan was produced for runtime validation.',
          ),
          this.statusItem({
            id: 'plan-validation',
            label: 'Plan validation',
            description: 'Plan status must be validated before approval.',
            status: input.plan.status === 'validated' ? 'passed' : 'blocked',
          }),
          this.statusItem({
            id: 'snapshot-policy',
            label: 'Snapshot policy',
            description: input.plan.needsSnapshot
              ? 'This plan requires a snapshot before real apply.'
              : 'This plan does not require snapshot before preview.',
            status: input.plan.needsSnapshot && !input.snapshotAvailable ? 'warning' : 'passed',
          }),
        ],
        actions: this.defaultActions({
          allowSelectedFiles: false,
          allowApprove: true,
        }),
        filePaths: input.plan.scope.candidateFiles.map((file) => file.path),
        createdAt,
      },
    ];
  }

  private buildPatchRequests(
    input: ApprovalCenterArtifactState,
    createdAt: string,
  ): ApprovalRequest[] {
    if (!input.proposal || input.proposal.status !== 'validated') {
      return [];
    }

    const diffReady = input.diff?.proposalId === input.proposal.id;
    const highRisk = input.proposal.riskLevel === 'high';

    const patchRequest: ApprovalRequest = {
      id: `approval-patch-${input.proposal.id}`,
      sessionId: input.sessionId,
      kind: 'patch',
      title: 'Approve patch proposal',
      description: input.proposal.summary,
      riskLevel: input.proposal.riskLevel,
      status: 'pending',
      target: {
        type: 'patch',
        id: input.proposal.id,
      },
      checklist: [
        this.passed(
          'runtime-authority',
          'Runtime authority',
          'Runtime owns apply and rollback control.',
        ),
        this.statusItem({
          id: 'proposal-validation',
          label: 'Proposal validation',
          description: 'Patch proposal must be validated before approval.',
          status: input.proposal.status === 'validated' ? 'passed' : 'blocked',
        }),
        this.statusItem({
          id: 'diff-preview',
          label: 'Diff preview',
          description: 'A matching diff preview must exist before apply.',
          status: diffReady ? 'passed' : 'blocked',
        }),
        this.statusItem({
          id: 'snapshot-check',
          label: 'Snapshot availability',
          description: input.snapshotAvailable
            ? 'Snapshot exists for controlled rollback.'
            : 'Snapshot is missing. Real apply should remain blocked for medium/high risk.',
          status: input.snapshotAvailable ? 'passed' : 'warning',
        }),
        this.statusItem({
          id: 'risk-review',
          label: 'Risk review',
          description: highRisk
            ? 'High-risk patch requires manual risk approval.'
            : 'Patch risk is acceptable for controlled workflow.',
          status: highRisk ? 'warning' : 'passed',
        }),
      ],
      actions: this.defaultActions({
        allowSelectedFiles: input.proposal.files.length > 1,
        allowApprove: diffReady && (!highRisk || input.snapshotAvailable),
      }),
      filePaths: input.proposal.files.map((file) => file.path),
      createdAt,
    };

    if (!highRisk) {
      return [patchRequest];
    }

    return [
      patchRequest,
      {
        id: `approval-risk-${input.proposal.id}`,
        sessionId: input.sessionId,
        kind: 'risk',
        title: 'Approve high-risk patch',
        description: 'High-risk changes require explicit risk acknowledgement before real apply.',
        riskLevel: 'high',
        status: 'pending',
        target: {
          type: 'risk',
          id: input.proposal.id,
        },
        checklist: [
          this.statusItem({
            id: 'high-risk-detected',
            label: 'High risk detected',
            description: 'Runtime detected a high-risk patch proposal.',
            status: 'warning',
          }),
          this.statusItem({
            id: 'snapshot-required',
            label: 'Snapshot required',
            description: 'High-risk approval should require a rollback point.',
            status: input.snapshotAvailable ? 'passed' : 'blocked',
          }),
        ],
        actions: this.defaultActions({
          allowSelectedFiles: false,
          allowApprove: input.snapshotAvailable,
        }),
        filePaths: input.proposal.files.map((file) => file.path),
        createdAt,
      },
    ];
  }

  private buildVerifyRequests(
    input: ApprovalCenterArtifactState,
    createdAt: string,
  ): ApprovalRequest[] {
    const commands = input.proposal?.verifyCommands ?? input.plan?.verifyCommands ?? [];

    if (commands.length === 0 || input.lastVerifyRun?.status === 'executed') {
      return [];
    }

    return [
      {
        id: `approval-verify-${input.sessionId}`,
        sessionId: input.sessionId,
        kind: 'verify',
        title: 'Approve verify command',
        description: `${commands.length} verify command(s) require explicit approval.`,
        riskLevel: 'low',
        status: 'pending',
        target: {
          type: 'verify',
          id: input.sessionId,
        },
        checklist: [
          this.passed(
            'safe-command-policy',
            'Safe command policy',
            'Verify command policy remains runtime-owned.',
          ),
          this.statusItem({
            id: 'approval-required',
            label: 'Explicit approval',
            description: 'Verify commands are blocked unless approval is present.',
            status: 'warning',
          }),
        ],
        actions: this.defaultActions({
          allowSelectedFiles: false,
          allowApprove: true,
        }),
        filePaths: [],
        createdAt,
      },
    ];
  }

  private buildDirtyWorkingTreeRequests(
    input: ApprovalCenterArtifactState,
    createdAt: string,
  ): ApprovalRequest[] {
    if (!input.dirtyWorkingTree) {
      return [];
    }

    return [
      {
        id: `approval-dirty-tree-${input.sessionId}`,
        sessionId: input.sessionId,
        kind: 'dirty_working_tree',
        title: 'Approve dirty working tree',
        description: 'Runtime detected dirty working tree approval is required before apply.',
        riskLevel: 'medium',
        status: 'pending',
        target: {
          type: 'dirty_working_tree',
          id: input.sessionId,
        },
        checklist: [
          this.statusItem({
            id: 'dirty-tree',
            label: 'Dirty working tree',
            description: 'Applying over existing changes can overwrite user work.',
            status: 'warning',
          }),
        ],
        actions: this.defaultActions({
          allowSelectedFiles: false,
          allowApprove: true,
        }),
        filePaths: [],
        createdAt,
      },
    ];
  }

  private buildRollbackRequests(
    input: ApprovalCenterArtifactState,
    createdAt: string,
  ): ApprovalRequest[] {
    if (!input.applyResult || input.applyResult.status !== 'applied') {
      return [];
    }

    return [
      {
        id: `approval-rollback-${input.applyResult.id}`,
        sessionId: input.sessionId,
        kind: 'rollback',
        title: 'Approve rollback',
        description: 'Rollback restores files from runtime backups. It requires explicit approval.',
        riskLevel: 'medium',
        status: 'pending',
        target: {
          type: 'rollback',
          id: input.applyResult.id,
        },
        checklist: [
          this.statusItem({
            id: 'apply-result',
            label: 'Applied patch exists',
            description: 'Rollback is available only after a real patch apply.',
            status: 'passed',
          }),
          this.statusItem({
            id: 'backup-source',
            label: 'Runtime backups',
            description: 'Rollback uses runtime-created backups, not git reset.',
            status: 'passed',
          }),
        ],
        actions: this.defaultActions({
          allowSelectedFiles: false,
          allowApprove: true,
        }),
        filePaths: input.applyResult.operationResults.map((operation) => operation.targetFile),
        createdAt,
      },
    ];
  }

  private defaultActions(input: {
    allowSelectedFiles: boolean;
    allowApprove: boolean;
  }): ApprovalAction[] {
    return [
      {
        kind: 'approve',
        label: 'Approve',
        enabled: input.allowApprove,
        ...(!input.allowApprove
          ? { blockedReason: 'Runtime approval checklist is not satisfied.' }
          : {}),
      },
      {
        kind: 'approve_selected_files',
        label: 'Approve selected files',
        enabled: input.allowSelectedFiles && input.allowApprove,
        ...(!input.allowSelectedFiles
          ? { blockedReason: 'This request does not support selected-file approval.' }
          : !input.allowApprove
            ? { blockedReason: 'Runtime approval checklist is not satisfied.' }
            : {}),
      },
      {
        kind: 'ask_revision',
        label: 'Ask revision',
        enabled: true,
      },
      {
        kind: 'reject',
        label: 'Reject',
        enabled: true,
      },
    ];
  }

  private normalizeSelectedFiles(input: {
    action: string;
    availableFilePaths: string[];
    selectedFilePaths?: string[] | undefined;
  }): string[] {
    if (input.action !== 'approve_selected_files') {
      return input.availableFilePaths;
    }

    const selected = input.selectedFilePaths ?? [];

    return selected.filter((filePath) => input.availableFilePaths.includes(filePath));
  }

  private highestRisk(requests: ApprovalRequest[]): ApprovalRiskLevel {
    if (requests.some((request) => request.riskLevel === 'high')) {
      return 'high';
    }

    if (requests.some((request) => request.riskLevel === 'medium')) {
      return 'medium';
    }

    return 'low';
  }

  private passed(id: string, label: string, description: string): ApprovalChecklistItem {
    return {
      id,
      label,
      description,
      status: 'passed',
    };
  }

  private statusItem(input: ApprovalChecklistItem): ApprovalChecklistItem {
    return input;
  }
}
