export type ValidationKind = 'typescript' | 'lint' | 'build';

export type ValidationStatus = 'passed' | 'failed' | 'skipped';

export type ValidationSeverity = 'info' | 'warning' | 'error';

export interface ValidationTarget {
  kind: ValidationKind;
  label: string;
  command: string;
}

export interface ValidationIssue {
  code: string;
  message: string;
  severity: ValidationSeverity;
  source?: string | undefined;
}

export interface ValidationResult {
  target: ValidationTarget;
  status: ValidationStatus;
  issues: ValidationIssue[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface ValidationRun {
  id: string;
  status: ValidationStatus;
  results: ValidationResult[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface RuntimeValidator {
  readonly target: ValidationTarget;

  validate(): ValidationResult | Promise<ValidationResult>;
}

export interface ValidationSummary {
  runId: string;
  status: ValidationStatus;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  issues: ValidationIssue[];
}
