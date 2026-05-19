import type { JsonObject } from '../types/SharedTypes.js';

export type SecuritySeverity = 'info' | 'warning' | 'error' | 'critical';

export type SecurityReviewStatus = 'passed' | 'warning' | 'failed';

export type SecurityFindingCategory =
  | 'secret_leak'
  | 'sensitive_path'
  | 'provider_output'
  | 'prompt_injection'
  | 'patch_threat'
  | 'approval_bypass'
  | 'agent_loop_abuse'
  | 'memory_poisoning'
  | 'runtime_report_leak'
  | 'git_safety'
  | 'tool_misuse'
  | 'retrieval_poisoning';

export interface SecurityFindingLocation {
  filePath?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
  source?: string | undefined;
}

export interface SecurityFinding {
  id: string;
  code: string;
  category: SecurityFindingCategory;
  severity: SecuritySeverity;
  message: string;
  location?: SecurityFindingLocation | undefined;
  evidence?: string | undefined;
  recommendation: string;
  metadata?: JsonObject | undefined;
}

export interface SecurityReviewSummary {
  status: SecurityReviewStatus;
  checkedAt: string;
  totalFindings: number;
  criticalFindings: number;
  errorFindings: number;
  warningFindings: number;
  infoFindings: number;
}

export interface SecurityReviewReport {
  version: 1;
  projectName: string;
  summary: SecurityReviewSummary;
  findings: SecurityFinding[];
  metadata?: JsonObject | undefined;
}

export interface SecretLeakDetectorOptions {
  redactedValue?: string | undefined;
  maxEvidenceLength?: number | undefined;
  additionalSecretKeyFragments?: string[] | undefined;
  additionalSensitivePathFragments?: string[] | undefined;
}

export interface SecretLeakScanInput {
  content: string;
  filePath?: string | undefined;
  source?: string | undefined;
}

export interface SecretLeakScanResult {
  safe: boolean;
  findings: SecurityFinding[];
  redactedContent: string;
}
