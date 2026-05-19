import type {
  AgentApprovalRequest,
  AgentApprovalScope,
  AgentLoopIssue,
  AgentLoopState,
} from './AgentTypes.js';
import type { JsonObject } from '../types/SharedTypes.js';

export interface AgentApprovalRequestInput {
  actionId: string;
  scope: AgentApprovalScope;
  reason: string;
  metadata?: JsonObject | undefined;
}

export interface AgentApprovalDecisionInput {
  approvalId: string;
  approved: boolean;
  reason: string;
}

export interface AgentApprovalCheckResult {
  allowed: boolean;
  issue?: AgentLoopIssue | undefined;
  approval?: AgentApprovalRequest | undefined;
}

export class AgentApprovalGate {
  public requestApproval(state: AgentLoopState, input: AgentApprovalRequestInput): AgentLoopState {
    const requestedAt = new Date().toISOString();

    const approval: AgentApprovalRequest = {
      id: `agent-approval-${requestedAt.replaceAll(':', '').replaceAll('.', '')}`,
      scope: input.scope,
      status: 'pending',
      actionId: input.actionId,
      reason: input.reason,
      requestedAt,
      metadata: input.metadata,
    };

    return {
      ...state,
      approvals: [...state.approvals, approval],
      updatedAt: requestedAt,
    };
  }

  public decide(state: AgentLoopState, input: AgentApprovalDecisionInput): AgentLoopState {
    const decidedAt = new Date().toISOString();
    let found = false;

    const approvals: AgentApprovalRequest[] = state.approvals.map((approval) => {
      if (approval.id !== input.approvalId) {
        return approval;
      }

      found = true;

      return {
        ...approval,
        status: input.approved ? 'approved' : 'rejected',
        decidedAt,
        decisionReason: input.reason,
      } satisfies AgentApprovalRequest;
    });

    if (!found) {
      return {
        ...state,
        issues: [
          ...state.issues,
          {
            code: 'AGENT_APPROVAL_NOT_FOUND',
            message: `Approval request not found: ${input.approvalId}`,
            severity: 'error',
          },
        ],
        status: 'failed',
        updatedAt: decidedAt,
        completedAt: decidedAt,
      };
    }

    return {
      ...state,
      approvals,
      updatedAt: decidedAt,
    };
  }

  public check(
    state: AgentLoopState,
    input: { actionId: string; scope: AgentApprovalScope },
  ): AgentApprovalCheckResult {
    const approval = [...state.approvals]
      .reverse()
      .find((item) => item.actionId === input.actionId && item.scope === input.scope);

    if (!approval) {
      return {
        allowed: false,
        issue: {
          code: 'AGENT_APPROVAL_REQUIRED',
          message: `Approval required for ${input.scope} before executing ${input.actionId}.`,
          severity: 'warning',
        },
      };
    }

    if (approval.status !== 'approved') {
      return {
        allowed: false,
        approval,
        issue: {
          code: 'AGENT_APPROVAL_NOT_GRANTED',
          message: `Approval ${approval.id} is ${approval.status}, not approved.`,
          severity: 'warning',
        },
      };
    }

    return {
      allowed: true,
      approval,
    };
  }
}
