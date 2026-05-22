import type { JsonObject } from '../types/SharedTypes.js';

export type InteractiveSessionStatus =
  | 'idle'
  | 'analyzing_project'
  | 'collecting_context'
  | 'planning'
  | 'waiting_user_input'
  | 'waiting_approval'
  | 'applying_patch'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'paused';

export type InteractiveSessionMessageRole = 'user' | 'runtime' | 'assistant' | 'system';

export type InteractiveSessionTimelineEventKind =
  | 'session_started'
  | 'session_paused'
  | 'session_resumed'
  | 'status_changed'
  | 'message_added'
  | 'decision_added'
  | 'runtime_action_added'
  | 'goal_updated'
  | 'session_completed'
  | 'session_failed';

export interface InteractiveSessionStartInput {
  id?: string | undefined;
  projectRoot: string;
  projectName: string;
  goal: string;
  createdBy?: string | undefined;
  metadata?: JsonObject | undefined;
}

export interface InteractiveSessionMessageInput {
  role: InteractiveSessionMessageRole;
  content: string;
  metadata?: JsonObject | undefined;
}

export interface InteractiveSessionDecisionInput {
  title: string;
  description: string;
  reason: string;
  metadata?: JsonObject | undefined;
}

export interface InteractiveSessionRuntimeActionInput {
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'blocked' | 'failed';
  metadata?: JsonObject | undefined;
}

export interface InteractiveSessionMessage {
  id: string;
  role: InteractiveSessionMessageRole;
  content: string;
  createdAt: string;
  metadata?: JsonObject | undefined;
}

export interface InteractiveSessionDecision {
  id: string;
  title: string;
  description: string;
  reason: string;
  createdAt: string;
  metadata?: JsonObject | undefined;
}

export interface InteractiveSessionRuntimeAction {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'blocked' | 'failed';
  createdAt: string;
  completedAt?: string | undefined;
  metadata?: JsonObject | undefined;
}

export interface InteractiveSessionTimelineEvent {
  id: string;
  kind: InteractiveSessionTimelineEventKind;
  message: string;
  createdAt: string;
  metadata?: JsonObject | undefined;
}

export interface InteractiveSessionGoal {
  original: string;
  current: string;
  updates: InteractiveSessionGoalUpdate[];
}

export interface InteractiveSessionGoalUpdate {
  id: string;
  previousGoal: string;
  nextGoal: string;
  reason: string;
  createdAt: string;
}

export interface InteractiveSessionState {
  id: string;
  projectRoot: string;
  projectName: string;
  status: InteractiveSessionStatus;
  goal: InteractiveSessionGoal;
  messages: InteractiveSessionMessage[];
  decisions: InteractiveSessionDecision[];
  runtimeActions: InteractiveSessionRuntimeAction[];
  timeline: InteractiveSessionTimelineEvent[];
  createdAt: string;
  updatedAt: string;
  pausedAt?: string | undefined;
  completedAt?: string | undefined;
  failedReason?: string | undefined;
  createdBy?: string | undefined;
  metadata?: JsonObject | undefined;
}
