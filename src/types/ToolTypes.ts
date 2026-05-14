import type { z } from 'zod';

export type ToolName = string;

export type ToolPermission = 'read' | 'write' | 'execute' | 'network' | 'dangerous';

export type ToolExecutionStatus = 'validated' | 'rejected' | 'not_executed' | 'executed' | 'failed';

export interface ToolDefinition<TInput extends z.ZodType = z.ZodType> {
  readonly name: ToolName;
  readonly description: string;
  readonly permissions: readonly ToolPermission[];
  readonly inputSchema: TInput;
}

export interface ToolExecutionContext {
  requestId: string;
  toolName: ToolName;
  startedAt: string;
}

export interface RuntimeTool<TInput extends z.ZodType = z.ZodType> extends ToolDefinition<TInput> {
  execute(input: unknown, context: ToolExecutionContext): Promise<ToolExecutionResult>;
}

export interface ToolExecutionRequest {
  id: string;
  toolName: ToolName;
  input: unknown;
  requestedAt: string;
  proposedBy: 'model' | 'runtime' | 'user';
}

export interface ToolExecutionValidationIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface ToolExecutionValidationResult {
  valid: boolean;
  status: ToolExecutionStatus;
  issues: ToolExecutionValidationIssue[];
  request: ToolExecutionRequest;
  tool?: ToolDefinition | undefined;
  validatedInput?: unknown;
  validatedAt: string;
}

export interface ToolExecutionResult {
  requestId: string;
  toolName: ToolName;
  status: ToolExecutionStatus;
  output?: unknown;
  issues: ToolExecutionValidationIssue[];
  executedAt: string;
  durationMs: number;
}

export interface ToolIntent {
  toolName: ToolName;
  input: unknown;
}
