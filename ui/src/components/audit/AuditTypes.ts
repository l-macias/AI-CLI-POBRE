import type { InteractiveSessionState, RuntimeEvent } from '../../types/runtime';

export type AuditEventKind =
  | 'user_request'
  | 'context_read'
  | 'plan_proposed'
  | 'patch_proposed'
  | 'blocked_action'
  | 'approval'
  | 'patch_applied'
  | 'runtime_decision'
  | 'pending';

export type AuditRiskLevel = 'low' | 'medium' | 'high';

export interface AuditTimelineEvent {
  id: string;
  kind: AuditEventKind;
  title: string;
  description: string;
  createdAt: string;
  riskLevel: AuditRiskLevel;
  source: 'session' | 'runtime_event' | 'derived';
  status: 'completed' | 'pending' | 'blocked' | 'approved' | 'info';
  metadata?: Record<string, unknown> | undefined;
}

export interface AuditTimelineViewModel {
  sessionId?: string | undefined;
  events: AuditTimelineEvent[];
}

export interface AuditTimelineInput {
  session: InteractiveSessionState | null;
  runtimeEvents: RuntimeEvent[];
}
