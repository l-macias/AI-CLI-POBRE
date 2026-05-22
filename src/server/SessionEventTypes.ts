import type { JsonObject } from '../types/SharedTypes.js';

export type SessionEventName =
  | 'session.started'
  | 'session.message'
  | 'session.command'
  | 'project.scanned'
  | 'context.collected'
  | 'plan.proposed'
  | 'patch.proposed'
  | 'risk.detected'
  | 'approval.required'
  | 'patch.applied'
  | 'verification.completed'
  | 'audit.generated'
  | 'snapshot.created'
  | 'snapshot.after_captured'
  | 'snapshot.restored'
  | 'workspace.resolved';

export interface SessionEvent {
  id: string;
  name: SessionEventName;
  sessionId?: string | undefined;
  projectRoot?: string | undefined;
  message: string;
  payload: JsonObject;
  createdAt: string;
}
