import type { FailureRecoveryAction } from './FailureTypes.js';
import type { ValidationIssue, ValidationKind, ValidationRun } from './ValidationTypes.js';

export type ValidationFeedbackCategory =
  | 'typescript_type_error'
  | 'typescript_import_error'
  | 'typescript_config_error'
  | 'lint_rule_violation'
  | 'build_error'
  | 'validation_skipped'
  | 'unknown';

export interface ValidationErrorLocation {
  filePath?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
}

export interface ParsedValidationIssue {
  validationKind: ValidationKind;
  category: ValidationFeedbackCategory;
  code: string;
  message: string;
  severity: ValidationIssue['severity'];
  source?: string | undefined;
  location: ValidationErrorLocation;
  symbol?: string | undefined;
  ruleId?: string | undefined;
  rawIssue: ValidationIssue;
}

export interface ValidationFailureContext {
  runId: string;
  status: ValidationRun['status'];
  parsedIssues: ParsedValidationIssue[];
  affectedFiles: string[];
  relatedFilesToRetrieve: string[];
  symbols: string[];
  createdAt: string;
}

export interface FixCandidate {
  title: string;
  description: string;
  targetFilePath?: string | undefined;
  symbol?: string | undefined;
  confidence: 'low' | 'medium' | 'high';
  requiresCodeIntelligence: boolean;
}

export interface ValidationFeedbackDecision {
  action: FailureRecoveryAction | 'inspect_related_files';
  reason: string;
  retryable: boolean;
  replanAllowed: boolean;
}

export interface ValidationFeedbackReport {
  context: ValidationFailureContext;
  fixCandidates: FixCandidate[];
  decision: ValidationFeedbackDecision;
  createdAt: string;
}
