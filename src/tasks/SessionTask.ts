import type { JsonObject } from '../types/SharedTypes.js';
import type { TaskStatus } from './TaskStatus.js';

export type SessionTaskKind =
  | 'inspect'
  | 'context'
  | 'plan'
  | 'patch'
  | 'approval'
  | 'verify'
  | 'report'
  | 'custom';

export interface SessionTask {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  kind: SessionTaskKind;
  status: TaskStatus;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  blockedReason?: string | undefined;
  metadata?: JsonObject | undefined;
}

export interface SessionTaskCreateInput {
  sessionId: string;
  title: string;
  description: string;
  kind?: SessionTaskKind | undefined;
  dependencies?: string[] | undefined;
  metadata?: JsonObject | undefined;
}

export interface SessionTaskQueueState {
  version: 1;
  sessionId: string;
  tasks: SessionTask[];
  createdAt: string;
  updatedAt: string;
}
