import type { ModelTier, ProviderTaskRole } from './ProviderStrategyTypes.js';
import type { ProviderName } from './ProviderTypes.js';
import type { ToolExecutionStatus, ToolName } from './ToolTypes.js';
import type { JsonObject, JsonValue } from './SharedTypes.js';

export type ObservabilitySeverity = 'debug' | 'info' | 'warn' | 'error';

export type RuntimeTraceEventType =
  | 'session_started'
  | 'session_completed'
  | 'loop_started'
  | 'loop_completed'
  | 'model_selected'
  | 'model_usage_recorded'
  | 'tool_requested'
  | 'tool_executed'
  | 'tool_blocked'
  | 'tool_failed'
  | 'sandbox_decision'
  | 'decision_recorded'
  | 'performance_measured'
  | 'error_reported'
  | 'custom';

export type RuntimeTraceScope = 'session' | 'loop' | 'model' | 'tool' | 'sandbox' | 'execution';

export interface RuntimeTraceEvent {
  id: string;
  type: RuntimeTraceEventType;
  scope: RuntimeTraceScope;
  source: string;
  severity: ObservabilitySeverity;
  timestamp: string;
  message: string;
  metadata?: JsonObject | undefined;
}

export interface RuntimeTraceInput {
  type: RuntimeTraceEventType;
  scope: RuntimeTraceScope;
  source: string;
  severity?: ObservabilitySeverity | undefined;
  message: string;
  metadata?: unknown;
}

export interface RuntimeSessionMetric {
  sessionId: string;
  startedAt: string;
  completedAt?: string | undefined;
  durationMs?: number | undefined;
  loopCount: number;
  toolExecutions: number;
  blockedActions: number;
  failedActions: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalEstimatedUsd: number;
}

export interface RuntimeLoopMetric {
  loopId: string;
  status: string;
  startedAt: string;
  completedAt?: string | undefined;
  durationMs?: number | undefined;
  executedSteps: number;
  blockedSteps: number;
  failedSteps: number;
  recoveryCount: number;
}

export interface RuntimeModelUsageMetric {
  provider: ProviderName;
  model: string;
  role: ProviderTaskRole;
  tier: ModelTier;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedUsd: number;
  reason: string;
  recordedAt: string;
}

export interface RuntimeToolMetric {
  toolName: ToolName;
  status: ToolExecutionStatus;
  durationMs: number;
  issueCount: number;
  recordedAt: string;
}

export interface RuntimeMetricsSummary {
  sessions: RuntimeSessionMetric[];
  loops: RuntimeLoopMetric[];
  modelUsage: RuntimeModelUsageMetric[];
  tools: RuntimeToolMetric[];
  totals: {
    events: number;
    loops: number;
    toolExecutions: number;
    blockedActions: number;
    failedActions: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedUsd: number;
    durationMs: number;
  };
}

export type TimelineEntryStatus = 'started' | 'completed' | 'blocked' | 'failed';

export interface TimelineEntry {
  id: string;
  label: string;
  source: string;
  status: TimelineEntryStatus;
  startedAt: string;
  completedAt?: string | undefined;
  durationMs?: number | undefined;
  metadata?: JsonObject | undefined;
}

export interface TokenUsageRecord {
  provider: ProviderName;
  model: string;
  role: ProviderTaskRole;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  recordedAt: string;
}

export interface TokenUsageSummary {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  byModel: TokenUsageRecord[];
}

export interface CostUsageRecord {
  provider: ProviderName;
  model: string;
  role: ProviderTaskRole;
  estimatedUsd: number;
  recordedAt: string;
}

export interface CostUsageSummary {
  totalEstimatedUsd: number;
  byModel: CostUsageRecord[];
}

export interface PerformanceProfile {
  id: string;
  operation: string;
  source: string;
  startedAt: string;
  completedAt?: string | undefined;
  durationMs?: number | undefined;
  status: 'running' | 'completed' | 'failed';
  metadata?: JsonObject | undefined;
}

export interface RuntimeErrorReport {
  id: string;
  source: string;
  code: string;
  message: string;
  severity: ObservabilitySeverity;
  reportedAt: string;
  metadata?: JsonObject | undefined;
}

export interface RuntimeDecisionLogEntry {
  id: string;
  source: string;
  decision: string;
  reason: string;
  createdAt: string;
  metadata?: JsonObject | undefined;
}

export interface SensitiveDataRedactorOptions {
  maxDepth?: number | undefined;
  redactedValue?: string | undefined;
  additionalSensitiveKeys?: string[] | undefined;
}

export interface JsonSafeObjectBuilderInput {
  key: string;
  value: JsonValue;
}
