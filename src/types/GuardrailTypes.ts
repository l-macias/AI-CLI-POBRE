import type { ToolExecutionRequest, ToolPermission } from './ToolTypes.js';

export type GuardrailSeverity = 'info' | 'warning' | 'error';

export type GuardrailStatus = 'passed' | 'blocked';

export type GuardrailKind =
  | 'permission'
  | 'protected_files'
  | 'dangerous_command'
  | 'token_limit'
  | 'context_overflow';

export interface GuardrailIssue {
  code: string;
  message: string;
  severity: GuardrailSeverity;
  guardrail: GuardrailKind;
}

export interface GuardrailInput {
  request: ToolExecutionRequest;
  requiredPermissions: readonly ToolPermission[];
  estimatedTokens?: number | undefined;
  maxTokens?: number | undefined;
  estimatedContextTokens?: number | undefined;
  maxContextTokens?: number | undefined;
}

export interface GuardrailResult {
  guardrail: GuardrailKind;
  status: GuardrailStatus;
  issues: GuardrailIssue[];
}

export interface RuntimeGuardrail {
  readonly kind: GuardrailKind;

  validate(input: GuardrailInput): GuardrailResult;
}

export interface ToolPermissionManagerResult {
  allowed: boolean;
  status: GuardrailStatus;
  issues: GuardrailIssue[];
  results: GuardrailResult[];
  checkedAt: string;
}
