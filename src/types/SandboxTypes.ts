export type CommandRiskLevel = 'low' | 'medium' | 'high' | 'blocked';

export type SandboxDecisionStatus = 'allowed' | 'blocked';

export interface SandboxCommandRequest {
  command: string;
  args: string[];
  cwd: string;
  pathArgs?: string[] | undefined;
  env?: Record<string, string> | undefined;
  timeoutMs?: number | undefined;
  maxOutputBytes?: number | undefined;
  networkAccess?: boolean | undefined;
}

export interface AllowedCommandDefinition {
  command: string;
  allowedArgs: readonly string[];
  description: string;
  riskLevel: CommandRiskLevel;
  defaultTimeoutMs: number;
  defaultMaxOutputBytes: number;
  allowNetwork: boolean;
  allowedCwdPrefixes: readonly string[];
}

export interface SandboxPolicyIssue {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface CommandRiskClassification {
  command: string;
  args: string[];
  riskLevel: CommandRiskLevel;
  reasons: string[];
}

export interface FileIsolationResult {
  allowed: boolean;
  issues: SandboxPolicyIssue[];
}

export interface CommandIsolationResult {
  allowed: boolean;
  issues: SandboxPolicyIssue[];
}

export interface ResourceLimitResult {
  allowed: boolean;
  timeoutMs: number;
  maxOutputBytes: number;
  issues: SandboxPolicyIssue[];
}

export interface SandboxPolicyDecision {
  status: SandboxDecisionStatus;
  request: SandboxCommandRequest;
  commandDefinition?: AllowedCommandDefinition | undefined;
  risk: CommandRiskClassification;
  timeoutMs: number;
  maxOutputBytes: number;
  issues: SandboxPolicyIssue[];
  decidedAt: string;
}
