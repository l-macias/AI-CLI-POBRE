import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type {
  AgentAction,
  AgentApprovalRequest,
  AgentDecision,
  AgentLoopIssue,
  AgentLoopState,
  AgentLoopStatus,
  AgentTurn,
} from './AgentTypes.js';
import type { JsonObject, JsonValue } from '../types/SharedTypes.js';

export interface AgentLoopStateStoreOptions {
  outputPath?: string | undefined;
}

const validStatuses = new Set<AgentLoopStatus>([
  'created',
  'waiting_for_user',
  'running',
  'completed',
  'cancelled',
  'failed',
]);

const validTurnRoles = new Set(['user', 'runtime', 'assistant', 'system']);

const validActionKinds = new Set([
  'inspect_project',
  'validate_project',
  'check_git',
  'build_repair_context',
  'request_repair_proposal',
  'show_diff_preview',
  'request_approval',
  'apply_patch',
  'revalidate_project',
  'report_result',
  'cancel',
  'scaffold_module',
]);

const validDecisionStatuses = new Set(['pending', 'selected', 'executed', 'skipped', 'blocked']);

const validApprovalStatuses = new Set(['pending', 'approved', 'rejected', 'expired']);

const validApprovalScopes = new Set(['patch_apply']);

const validIssueSeverities = new Set(['info', 'warning', 'error']);

export class AgentLoopStateStore {
  private readonly outputPath: string;

  public constructor(options: AgentLoopStateStoreOptions = {}) {
    this.outputPath = resolve(options.outputPath ?? '.runtime/agent-loop-state.json');
  }

  public async save(state: AgentLoopState): Promise<string> {
    await mkdir(dirname(this.outputPath), {
      recursive: true,
    });

    await writeFile(this.outputPath, JSON.stringify(state, null, 2), 'utf8');

    return this.outputPath;
  }

  public async load(): Promise<AgentLoopState> {
    const raw = await readFile(this.outputPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const validation = this.validateAgentLoopState(parsed);

    if (!validation.valid) {
      throw new Error(`Invalid agent loop state file: ${validation.issues.join('; ')}`);
    }

    return parsed as AgentLoopState;
  }

  private validateAgentLoopState(value: unknown): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!this.isRecord(value)) {
      return {
        valid: false,
        issues: ['root must be an object'],
      };
    }

    if (!this.isNonEmptyString(value['id'])) {
      issues.push('id must be a non-empty string');
    }

    if (!this.isAgentLoopStatus(value['status'])) {
      issues.push('status is invalid');
    }

    if (!this.isNonEmptyString(value['objective'])) {
      issues.push('objective must be a non-empty string');
    }

    if (!this.isNonEmptyString(value['projectRoot'])) {
      issues.push('projectRoot must be a non-empty string');
    }

    if (!this.isNonEmptyString(value['projectName'])) {
      issues.push('projectName must be a non-empty string');
    }

    if (!this.isStringArray(value['targetFiles'])) {
      issues.push('targetFiles must be a string array');
    }

    if (!this.isAgentTurnArray(value['turns'])) {
      issues.push('turns must be a valid AgentTurn array');
    }

    if (!this.isAgentActionArray(value['actions'])) {
      issues.push('actions must be a valid AgentAction array');
    } else {
      issues.push(...this.validateRequiredActions(value['actions']));
      issues.push(...this.validateUniqueIds('actions', value['actions']));
    }

    if (!this.isAgentDecisionArray(value['decisions'])) {
      issues.push('decisions must be a valid AgentDecision array');
    } else {
      issues.push(...this.validateUniqueIds('decisions', value['decisions']));
    }

    if (!this.isAgentApprovalArray(value['approvals'])) {
      issues.push('approvals must be a valid AgentApprovalRequest array');
    } else {
      issues.push(...this.validateUniqueIds('approvals', value['approvals']));
      issues.push(...this.validateApprovalMetadata(value['approvals']));
    }

    if (!this.isAgentIssueArray(value['issues'])) {
      issues.push('issues must be a valid AgentLoopIssue array');
    }

    if (!this.isNonEmptyString(value['createdAt'])) {
      issues.push('createdAt must be a non-empty string');
    }

    if (!this.isNonEmptyString(value['updatedAt'])) {
      issues.push('updatedAt must be a non-empty string');
    }

    if (
      Object.prototype.hasOwnProperty.call(value, 'completedAt') &&
      value['completedAt'] !== undefined &&
      !this.isNonEmptyString(value['completedAt'])
    ) {
      issues.push('completedAt must be a string when present');
    }

    if (
      Object.prototype.hasOwnProperty.call(value, 'metadata') &&
      value['metadata'] !== undefined &&
      !this.isJsonObject(value['metadata'])
    ) {
      issues.push('metadata must be a JSON object when present');
    }

    issues.push(...this.validateTerminalStateConsistency(value));

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private validateRequiredActions(actions: AgentAction[]): string[] {
    const issues: string[] = [];

    for (const kind of validActionKinds) {
      const matches = actions.filter((action) => action.kind === kind);

      if (matches.length > 1) {
        issues.push(`duplicate action kind: ${kind}`);
      }
    }

    const applyPatch = actions.find((action) => action.kind === 'apply_patch');

    if (!applyPatch) {
      issues.push('missing apply_patch action');
    } else if (applyPatch.requiresApproval !== true) {
      issues.push('apply_patch action must require approval');
    }

    const requestApproval = actions.find((action) => action.kind === 'request_approval');

    if (!requestApproval) {
      issues.push('missing request_approval action');
    } else if (requestApproval.requiresApproval !== true) {
      issues.push('request_approval action must require approval');
    }

    return issues;
  }

  private validateApprovalMetadata(approvals: AgentApprovalRequest[]): string[] {
    const issues: string[] = [];

    for (const approval of approvals) {
      if (approval.scope !== 'patch_apply') {
        continue;
      }

      if (approval.actionId !== 'agent-action-apply_patch') {
        issues.push(`patch approval ${approval.id} must target agent-action-apply_patch`);
      }

      if (approval.status === 'approved') {
        if (!approval.metadata || !this.isJsonObject(approval.metadata)) {
          issues.push(`approved patch approval ${approval.id} must include metadata`);
          continue;
        }

        if (!this.isNonEmptyString(approval.metadata['proposalFingerprint'])) {
          issues.push(
            `approved patch approval ${approval.id} must include proposalFingerprint metadata`,
          );
        }

        if (!this.isNonEmptyString(approval.metadata['proposalId'])) {
          issues.push(`approved patch approval ${approval.id} must include proposalId metadata`);
        }
      }
    }

    return issues;
  }

  private validateTerminalStateConsistency(state: Record<string, unknown>): string[] {
    const issues: string[] = [];
    const status = state['status'];

    if (status !== 'completed' && status !== 'cancelled' && status !== 'failed') {
      return issues;
    }

    if (!this.isNonEmptyString(state['completedAt'])) {
      issues.push(`terminal status ${String(status)} requires completedAt`);
    }

    return issues;
  }

  private validateUniqueIds(
    label: string,
    values: readonly {
      id: string;
    }[],
  ): string[] {
    const issues: string[] = [];
    const seen = new Set<string>();

    for (const value of values) {
      if (seen.has(value.id)) {
        issues.push(`${label} contains duplicate id: ${value.id}`);
      }

      seen.add(value.id);
    }

    return issues;
  }

  private isAgentTurnArray(value: unknown): value is AgentTurn[] {
    return Array.isArray(value) && value.every((item) => this.isAgentTurn(item));
  }

  private isAgentTurn(value: unknown): value is AgentTurn {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isNonEmptyString(value['id']) &&
      typeof value['role'] === 'string' &&
      validTurnRoles.has(value['role']) &&
      this.isNonEmptyString(value['message']) &&
      this.isNonEmptyString(value['createdAt']) &&
      this.isOptionalJsonObject(value['metadata'])
    );
  }

  private isAgentActionArray(value: unknown): value is AgentAction[] {
    return Array.isArray(value) && value.every((item) => this.isAgentAction(item));
  }

  private isAgentAction(value: unknown): value is AgentAction {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isNonEmptyString(value['id']) &&
      typeof value['kind'] === 'string' &&
      validActionKinds.has(value['kind']) &&
      this.isNonEmptyString(value['label']) &&
      this.isNonEmptyString(value['description']) &&
      typeof value['status'] === 'string' &&
      validDecisionStatuses.has(value['status']) &&
      typeof value['requiresApproval'] === 'boolean' &&
      this.isNonEmptyString(value['createdAt']) &&
      this.isOptionalString(value['completedAt']) &&
      this.isOptionalJsonObject(value['metadata'])
    );
  }

  private isAgentDecisionArray(value: unknown): value is AgentDecision[] {
    return Array.isArray(value) && value.every((item) => this.isAgentDecision(item));
  }

  private isAgentDecision(value: unknown): value is AgentDecision {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isNonEmptyString(value['id']) &&
      this.isNonEmptyString(value['actionId']) &&
      typeof value['selected'] === 'boolean' &&
      this.isNonEmptyString(value['reason']) &&
      this.isNonEmptyString(value['createdAt']) &&
      this.isOptionalJsonObject(value['metadata'])
    );
  }

  private isAgentApprovalArray(value: unknown): value is AgentApprovalRequest[] {
    return Array.isArray(value) && value.every((item) => this.isAgentApproval(item));
  }

  private isAgentApproval(value: unknown): value is AgentApprovalRequest {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isNonEmptyString(value['id']) &&
      typeof value['scope'] === 'string' &&
      validApprovalScopes.has(value['scope']) &&
      typeof value['status'] === 'string' &&
      validApprovalStatuses.has(value['status']) &&
      this.isNonEmptyString(value['actionId']) &&
      this.isNonEmptyString(value['reason']) &&
      this.isNonEmptyString(value['requestedAt']) &&
      this.isOptionalString(value['decidedAt']) &&
      this.isOptionalString(value['decisionReason']) &&
      this.isOptionalJsonObject(value['metadata'])
    );
  }

  private isAgentIssueArray(value: unknown): value is AgentLoopIssue[] {
    return Array.isArray(value) && value.every((item) => this.isAgentIssue(item));
  }

  private isAgentIssue(value: unknown): value is AgentLoopIssue {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      this.isNonEmptyString(value['code']) &&
      this.isNonEmptyString(value['message']) &&
      typeof value['severity'] === 'string' &&
      validIssueSeverities.has(value['severity'])
    );
  }

  private isAgentLoopStatus(value: unknown): value is AgentLoopStatus {
    return typeof value === 'string' && validStatuses.has(value as AgentLoopStatus);
  }

  private isOptionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
  }

  private isOptionalJsonObject(value: unknown): boolean {
    return value === undefined || this.isJsonObject(value);
  }

  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isJsonObject(value: unknown): value is JsonObject {
    if (!this.isRecord(value)) {
      return false;
    }

    return Object.values(value).every((item) => this.isJsonValue(item));
  }

  private isJsonValue(value: unknown): value is JsonValue {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return true;
    }

    if (Array.isArray(value)) {
      return value.every((item) => this.isJsonValue(item));
    }

    return this.isJsonObject(value);
  }
}
