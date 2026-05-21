import type {
  AgentAction,
  AgentLoopIssue,
  AgentLoopState,
  AgentStepExecutionResult,
} from './AgentTypes.js';
import { AgentActionMenu } from './AgentActionMenu.js';
import { AgentApprovalGate } from './AgentApprovalGate.js';
import { AgentLoopReporter } from './AgentLoopReporter.js';
import { AgentLoopStateStore } from './AgentLoopStateStore.js';
import { AgentPatchApplyIntentBuilder } from './AgentPatchApplyIntentBuilder.js';
import { AgentRuntimeBridge } from './AgentRuntimeBridge.js';
import { AgentTurnFactory } from './AgentTurn.js';
import { AgentPatchApprovalSnapshot } from './AgentPatchApprovalSnapshot.js';
import type { JsonObject, JsonValue } from '../types/SharedTypes.js';

export interface AgentStepExecutorOptions {
  runtimeBridge?: AgentRuntimeBridge | undefined;
  actionMenu?: AgentActionMenu | undefined;
  approvalGate?: AgentApprovalGate | undefined;
  patchApplyIntentBuilder?: AgentPatchApplyIntentBuilder | undefined;
  patchApprovalSnapshot?: AgentPatchApprovalSnapshot | undefined;
  store?: AgentLoopStateStore | undefined;
  reporter?: AgentLoopReporter | undefined;
  turnFactory?: AgentTurnFactory | undefined;
}

export class AgentStepExecutor {
  private readonly runtimeBridge: AgentRuntimeBridge;
  private readonly actionMenu: AgentActionMenu;
  private readonly approvalGate: AgentApprovalGate;
  private readonly patchApplyIntentBuilder: AgentPatchApplyIntentBuilder;
  private readonly patchApprovalSnapshot: AgentPatchApprovalSnapshot;
  private readonly store: AgentLoopStateStore;
  private readonly reporter: AgentLoopReporter;
  private readonly turnFactory: AgentTurnFactory;

  public constructor(options: AgentStepExecutorOptions = {}) {
    this.runtimeBridge = options.runtimeBridge ?? new AgentRuntimeBridge();
    this.actionMenu = options.actionMenu ?? new AgentActionMenu();
    this.approvalGate = options.approvalGate ?? new AgentApprovalGate();
    this.patchApplyIntentBuilder =
      options.patchApplyIntentBuilder ?? new AgentPatchApplyIntentBuilder();
    this.patchApprovalSnapshot = options.patchApprovalSnapshot ?? new AgentPatchApprovalSnapshot();
    this.store = options.store ?? new AgentLoopStateStore();
    this.reporter = options.reporter ?? new AgentLoopReporter();
    this.turnFactory = options.turnFactory ?? new AgentTurnFactory();
  }

  public async execute(state: AgentLoopState, actionId: string): Promise<AgentLoopState> {
    const action = this.actionMenu.findAction(state, actionId);

    if (!action) {
      return this.withIssue(state, {
        code: 'AGENT_ACTION_NOT_FOUND',
        message: `Agent action not found: ${actionId}`,
        severity: 'error',
      });
    }

    if (!this.actionMenu.canExecute(state, action)) {
      return this.withIssue(state, {
        code: 'AGENT_ACTION_NOT_EXECUTABLE',
        message: `Agent action cannot be executed in current state: ${actionId}`,
        severity: 'warning',
      });
    }

    if (action.kind === 'apply_patch') {
      const approval = this.approvalGate.check(state, {
        actionId: action.id,
        scope: 'patch_apply',
      });

      if (!approval.allowed) {
        return this.blockAction(
          state,
          action,
          approval.issue?.message ?? 'Patch application requires approval.',
          approval.issue,
        );
      }

      const intent = this.patchApplyIntentBuilder.buildFromMetadata(state.metadata);
      const snapshotVerification = this.patchApprovalSnapshot.verify({
        proposal: intent.proposal,
        approvalMetadata: approval.approval?.metadata,
      });

      if (!snapshotVerification.valid) {
        return this.blockAction(
          state,
          action,
          snapshotVerification.reason ?? 'Patch approval snapshot mismatch.',
          {
            code: 'AGENT_APPROVAL_PATCH_SNAPSHOT_MISMATCH',
            message:
              snapshotVerification.reason ??
              'Approved patch snapshot does not match current patch proposal.',
            severity: 'error',
          },
        );
      }
    }

    try {
      const execution = await this.executeAction(state, action);
      return this.withExecution(state, action, execution);
    } catch (error) {
      return this.withIssue(state, {
        code: 'AGENT_STEP_EXECUTION_FAILED',
        message: error instanceof Error ? error.message : String(error),
        severity: 'error',
      });
    }
  }

  public async approve(
    state: AgentLoopState,
    approvalId: string,
    reason: string,
  ): Promise<AgentLoopState> {
    const updated = this.approvalGate.decide(state, {
      approvalId,
      approved: true,
      reason,
    });

    return this.persist({
      ...updated,
      turns: [
        ...updated.turns,
        this.turnFactory.create({
          role: 'user',
          message: `Approved ${approvalId}: ${reason}`,
        }),
      ],
    });
  }

  public async reject(
    state: AgentLoopState,
    approvalId: string,
    reason: string,
  ): Promise<AgentLoopState> {
    const updated = this.approvalGate.decide(state, {
      approvalId,
      approved: false,
      reason,
    });

    return this.persist({
      ...updated,
      turns: [
        ...updated.turns,
        this.turnFactory.create({
          role: 'user',
          message: `Rejected ${approvalId}: ${reason}`,
        }),
      ],
    });
  }

  private async executeAction(
    state: AgentLoopState,
    action: AgentAction,
  ): Promise<AgentStepExecutionResult> {
    const createdAt = new Date().toISOString();

    if (action.kind === 'inspect_project') {
      const output = await this.runtimeBridge.inspectProject(state);

      return {
        actionId: action.id,
        actionKind: action.kind,
        status: 'executed',
        message: 'Project inspection completed.',
        summary: this.summarizeInspection(output),
        createdAt,
      };
    }

    if (action.kind === 'validate_project') {
      const output = await this.runtimeBridge.validateProject(state);

      return {
        actionId: action.id,
        actionKind: action.kind,
        status: 'executed',
        message: 'Project validation completed.',
        summary: this.summarizeValidation(output),
        createdAt,
      };
    }

    if (action.kind === 'check_git') {
      const output = await this.runtimeBridge.checkGit(state);

      return {
        actionId: action.id,
        actionKind: action.kind,
        status: 'executed',
        message: 'Git boundary check completed.',
        summary: this.summarizeGit(output),
        createdAt,
      };
    }

    if (action.kind === 'build_repair_context') {
      return {
        actionId: action.id,
        actionKind: action.kind,
        status: 'executed',
        message: 'Repair context will be built inside the repair proposal step.',
        summary: {
          delegatedTo: 'request_repair_proposal',
        },
        createdAt,
      };
    }
    if (action.kind === 'scaffold_module') {
      const output = await this.runtimeBridge.scaffoldModule(state);

      return {
        actionId: action.id,
        actionKind: action.kind,
        status: 'executed',
        message: 'Scaffold module proposal generated.',
        summary: this.summarizeScaffold(output),
        createdAt: new Date().toISOString(),
      };
    }
    if (action.kind === 'request_repair_proposal') {
      const output = await this.runtimeBridge.requestRepairProposal(state);

      return {
        actionId: action.id,
        actionKind: action.kind,
        status: 'executed',
        message: 'Repair proposal requested through runtime-controlled provider flow.',
        summary: this.summarizeRepair(output),
        createdAt,
      };
    }

    if (action.kind === 'show_diff_preview') {
      return {
        actionId: action.id,
        actionKind: action.kind,
        status: 'executed',
        message: 'Diff preview summary prepared from latest repair attempt.',
        summary: this.summarizeDiffPreviewFromState(state),
        createdAt,
      };
    }

    if (action.kind === 'request_approval') {
      const readiness = this.evaluatePatchApprovalReadiness(state);

      if (!readiness.ready) {
        return {
          actionId: action.id,
          actionKind: action.kind,
          status: 'blocked',
          message: readiness.reason,
          summary: readiness.summary,
          createdAt,
        };
      }

      return {
        actionId: action.id,
        actionKind: action.kind,
        status: 'executed',
        message: 'Approval requested for patch application.',
        summary: this.requestPatchApprovalSummary(state, action),
        createdAt,
      };
    }

    if (action.kind === 'apply_patch') {
      const intent = this.patchApplyIntentBuilder.buildFromMetadata(state.metadata);
      const output = await this.runtimeBridge.applyPatch({
        state,
        proposal: intent.proposal,
      });

      return {
        actionId: action.id,
        actionKind: action.kind,
        status: 'executed',
        message: 'Patch applied through approval-gated PatchApplyRunner.',
        summary: this.summarizePatchApply(output),
        createdAt,
      };
    }

    if (action.kind === 'revalidate_project') {
      const output = await this.runtimeBridge.revalidateProject(state);

      return {
        actionId: action.id,
        actionKind: action.kind,
        status: 'executed',
        message: 'Project revalidation completed.',
        summary: this.summarizeValidation(output),
        createdAt,
      };
    }

    if (action.kind === 'report_result') {
      return {
        actionId: action.id,
        actionKind: action.kind,
        status: 'executed',
        message: 'Agent loop completed and final report updated.',
        summary: this.summarizeFinalReport(state),
        createdAt,
      };
    }

    if (action.kind === 'cancel') {
      return {
        actionId: action.id,
        actionKind: action.kind,
        status: 'executed',
        message: 'Cancel action selected.',
        summary: {
          cancelled: true,
        },
        createdAt,
      };
    }

    return {
      actionId: action.id,
      actionKind: action.kind,
      status: 'blocked',
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      message: `Unsupported action kind: ${action.kind}`,
      summary: {
        unsupportedAction: action.kind,
      },
      createdAt,
    };
  }

  private async withExecution(
    state: AgentLoopState,
    action: AgentAction,
    execution: AgentStepExecutionResult,
  ): Promise<AgentLoopState> {
    const updatedAt = new Date().toISOString();
    const approvalState =
      action.kind === 'request_approval' && execution.status === 'executed'
        ? this.approvalGate.requestApproval(state, {
            actionId: 'agent-action-apply_patch',
            scope: 'patch_apply',
            reason: 'User approval required before applying runtime-generated patch proposal.',
            metadata: execution.summary,
          })
        : state;

    const updatedMetadata = this.mergeMetadata(approvalState.metadata, {
      lastExecution: this.executionToJson(execution),
      [`execution_${action.kind}`]: execution.summary,
    });

    const nextStatus =
      action.kind === 'cancel'
        ? 'cancelled'
        : action.kind === 'report_result'
          ? 'completed'
          : 'running';

    const completedAt =
      action.kind === 'cancel' || action.kind === 'report_result'
        ? updatedAt
        : approvalState.completedAt;

    const updated: AgentLoopState = {
      ...approvalState,
      status: nextStatus,
      actions: approvalState.actions.map((item) => {
        if (item.id !== action.id) {
          return item;
        }

        return {
          ...item,
          status: execution.status === 'blocked' ? 'blocked' : 'executed',
          completedAt: updatedAt,
          metadata: execution.summary,
        };
      }),
      turns: [
        ...approvalState.turns,
        this.turnFactory.create({
          role: 'runtime',
          message: execution.message,
          metadata: execution.summary,
        }),
      ],
      metadata: updatedMetadata,
      updatedAt,
      completedAt,
    };

    return this.persist(updated);
  }

  private evaluatePatchApprovalReadiness(state: AgentLoopState): {
    ready: boolean;
    reason: string;
    summary: JsonObject;
  } {
    const repairSummary = this.asRecord(state.metadata?.['execution_request_repair_proposal']);
    const repairStatus = this.stringValue(repairSummary['status']);
    const patchValid = this.booleanValue(repairSummary['patchValid']);

    if (repairStatus !== 'diff_ready') {
      return {
        ready: false,
        reason: `Patch approval cannot be requested because repair status is "${repairStatus}".`,
        summary: {
          approvalReady: false,
          repairStatus,
          patchValid,
          reason: 'repair_status_not_diff_ready',
        },
      };
    }

    if (!patchValid) {
      return {
        ready: false,
        reason: 'Patch approval cannot be requested because the patch proposal is not valid.',
        summary: {
          approvalReady: false,
          repairStatus,
          patchValid,
          reason: 'patch_not_valid',
        },
      };
    }

    try {
      const intent = this.patchApplyIntentBuilder.buildFromMetadata(state.metadata);

      if (intent.proposal.operations.length === 0) {
        return {
          ready: false,
          reason: 'Patch approval cannot be requested because the proposal has no operations.',
          summary: {
            approvalReady: false,
            repairStatus,
            patchValid,
            proposalId: intent.proposal.id,
            operationCount: 0,
            reason: 'proposal_has_no_operations',
          },
        };
      }

      return {
        ready: true,
        reason: 'Patch approval can be requested.',
        summary: {
          approvalReady: true,
          repairStatus,
          patchValid,
          proposalId: intent.proposal.id,
          operationCount: intent.proposal.operations.length,
        },
      };
    } catch (error) {
      return {
        ready: false,
        reason: `Patch approval cannot be requested: ${
          error instanceof Error ? error.message : String(error)
        }`,
        summary: {
          approvalReady: false,
          repairStatus,
          patchValid,
          reason: 'invalid_patch_apply_intent',
        },
      };
    }
  }
  private requestPatchApprovalSummary(state: AgentLoopState, action: AgentAction): JsonObject {
    const repairSummary = this.asRecord(state.metadata?.['execution_request_repair_proposal']);
    const diffSummary = this.asRecord(state.metadata?.['execution_show_diff_preview']);
    const intent = this.patchApplyIntentBuilder.buildFromMetadata(state.metadata);
    const snapshot = this.patchApprovalSnapshot.create({
      proposal: intent.proposal,
    });

    return {
      actionId: action.id,
      approvalScope: 'patch_apply',
      targetActionId: 'agent-action-apply_patch',
      repairStatus: this.stringValue(repairSummary['status']),
      proposalId: this.stringValue(repairSummary['proposalId']),
      diffPreviewCount: this.numberValue(diffSummary['diffPreviewCount']),
      patchValid: this.booleanValue(repairSummary['patchValid']),
      ...snapshot,
      warning: 'Patch will not be applied until approval is explicitly granted.',
    };
  }
  private async blockAction(
    state: AgentLoopState,
    action: AgentAction,
    reason: string,
    issue?: AgentLoopIssue,
  ): Promise<AgentLoopState> {
    const updatedAt = new Date().toISOString();

    const updated: AgentLoopState = {
      ...state,
      status: 'running',
      actions: state.actions.map((item) => {
        if (item.id !== action.id) {
          return item;
        }

        return {
          ...item,
          status: 'blocked',
          completedAt: updatedAt,
          metadata: {
            blockedReason: reason,
          },
        };
      }),
      turns: [
        ...state.turns,
        this.turnFactory.create({
          role: 'runtime',
          message: reason,
          metadata: {
            blockedAction: action.id,
          },
        }),
      ],
      issues: [
        ...state.issues,
        issue ?? {
          code: 'AGENT_ACTION_BLOCKED',
          message: reason,
          severity: 'warning',
        },
      ],
      updatedAt,
    };

    return this.persist(updated);
  }

  private async withIssue(state: AgentLoopState, issue: AgentLoopIssue): Promise<AgentLoopState> {
    const updatedAt = new Date().toISOString();

    const updated: AgentLoopState = {
      ...state,
      status: issue.severity === 'error' ? 'failed' : state.status,
      issues: [...state.issues, issue],
      turns: [
        ...state.turns,
        this.turnFactory.create({
          role: 'runtime',
          message: `${issue.code}: ${issue.message}`,
        }),
      ],
      updatedAt,
      completedAt: issue.severity === 'error' ? updatedAt : state.completedAt,
    };

    return this.persist(updated);
  }

  private async persist(state: AgentLoopState): Promise<AgentLoopState> {
    await this.store.save(state);
    await this.reporter.write(state);

    return state;
  }

  private summarizeInspection(output: unknown): JsonObject {
    const record = this.asRecord(output);
    const inspection = this.asRecord(record['inspection']);
    const config = this.asRecord(inspection['configInfo']);
    const targetFiles = this.asArray(inspection['targetFiles']);

    return {
      status: this.stringValue(record['status']),
      projectRoot: this.stringValue(inspection['projectRoot']),
      detectedStack: this.stringArray(config['detectedStack']),
      targetFileCount: targetFiles.length,
    };
  }

  private summarizeValidation(output: unknown): JsonObject {
    const record = this.asRecord(output);
    const validation = this.asRecord(record['validation']);
    const commands = this.asArray(validation['commands']);
    const findings = this.asArray(validation['findings']);

    return {
      status: this.stringValue(validation['status']),
      commandCount: commands.length,
      findingCount: findings.length,
    };
  }

  private summarizeGit(output: unknown): JsonObject {
    const record = this.asRecord(output);
    const boundary = this.asRecord(record['boundary']);
    const guard = this.asRecord(record['guard']);

    return {
      action: this.stringValue(record['action']),
      branch: this.stringValue(boundary['branch']),
      workingTreeState: this.stringValue(boundary['workingTreeState']),
      guardDecision: this.stringValue(guard['decision']),
      allowed: this.booleanValue(guard['allowed']),
    };
  }
  private summarizeScaffold(output: unknown): JsonObject {
    const record = this.asRecord(output);
    const patchProposal = this.asRecord(record['patchProposal']);
    const proposal = this.asRecord(record['proposal']);
    const safety = this.asRecord(record['safety']);
    const diffPreviews = this.asArray(record['diffPreviews']);
    const operations = this.asArray(patchProposal['operations']);

    return {
      status: this.stringValue(record['status']),
      reportPath: this.stringValue(record['reportPath']),
      proposalId: this.stringValue(proposal['id']),
      patchProposalId: this.stringValue(patchProposal['id']),
      safetySafe: this.booleanValue(safety['safe']),
      operationCount: operations.length,
      diffPreviewCount: diffPreviews.length,
    };
  }
  private summarizeRepair(output: unknown): JsonObject {
    const record = this.asRecord(output);
    const proposal = this.asRecord(record['proposal']);
    const patchValidation = this.asRecord(record['patchValidation']);
    const diffPreviews = this.asArray(record['diffPreviews']);
    const modelPolicyDecision = this.asRecord(record['modelPolicyDecision']);
    const agentProviderAudit = this.asRecord(record['agentProviderAudit']);

    return {
      status: this.stringValue(record['status']),
      proposalId: this.stringValue(proposal['id']),
      proposal: this.jsonValue(proposal),
      patchValid: this.booleanValue(patchValidation['valid']),
      diffPreviewCount: diffPreviews.length,
      modelPolicyStatus: this.stringValue(modelPolicyDecision['status']),
      selectedModel: this.stringValue(modelPolicyDecision['selectedModel']),
      fallbackUsed: this.booleanValue(record['providerFallbackUsed']),
      agentProviderAudit: this.jsonValue(agentProviderAudit),
    };
  }

  private summarizePatchApply(output: unknown): JsonObject {
    const record = this.asRecord(output);
    const gitBoundary = this.asRecord(record['gitBoundary']);
    const guard = this.asRecord(gitBoundary['guard']);
    const operationResults = this.asArray(record['operationResults']);
    const issues = this.asArray(record['issues']);

    return {
      status: this.stringValue(record['status']),
      proposalId: this.stringValue(record['proposalId']),
      operationCount: operationResults.length,
      issueCount: issues.length,
      guardDecision: this.stringValue(guard['decision']),
    };
  }

  private summarizeDiffPreviewFromState(state: AgentLoopState): JsonObject {
    const repairSummary = this.asRecord(state.metadata?.['execution_request_repair_proposal']);

    return {
      source: 'latest_repair_attempt_summary',
      repairStatus: this.stringValue(repairSummary['status']),
      proposalId: this.stringValue(repairSummary['proposalId']),
      diffPreviewCount: this.numberValue(repairSummary['diffPreviewCount']),
      patchValid: this.booleanValue(repairSummary['patchValid']),
    };
  }
  private summarizeFinalReport(state: AgentLoopState): JsonObject {
    const repairSummary = this.asRecord(state.metadata?.['execution_request_repair_proposal']);
    const patchApplySummary = this.asRecord(state.metadata?.['execution_apply_patch']);
    const revalidateSummary = this.asRecord(state.metadata?.['execution_revalidate_project']);

    return {
      completed: true,
      repairStatus: this.stringValue(repairSummary['status']),
      proposalId: this.stringValue(repairSummary['proposalId']),
      patchApplyStatus: this.stringValue(patchApplySummary['status']),
      patchApplyProposalId: this.stringValue(patchApplySummary['proposalId']),
      revalidationStatus: this.stringValue(revalidateSummary['status']),
      approvals: state.approvals.length,
      issues: state.issues.length,
    };
  }
  private executionToJson(execution: AgentStepExecutionResult): JsonObject {
    return {
      actionId: execution.actionId,
      actionKind: execution.actionKind,
      status: execution.status,
      message: execution.message,
      summary: execution.summary,
      createdAt: execution.createdAt,
    };
  }

  private mergeMetadata(
    current: JsonObject | undefined,
    extra: Record<string, JsonValue>,
  ): JsonObject {
    return {
      ...(current ?? {}),
      ...extra,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value : 'unknown';
  }

  private numberValue(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private booleanValue(value: unknown): boolean {
    return value === true;
  }

  private stringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  private jsonValue(value: unknown): JsonValue {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.jsonValue(item));
    }

    if (typeof value === 'object') {
      const output: JsonObject = {};

      for (const [key, nestedValue] of Object.entries(value)) {
        output[key] = this.jsonValue(nestedValue);
      }

      return output;
    }

    return null;
  }
}
