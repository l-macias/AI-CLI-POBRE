import type {
  ParsedValidationIssue,
  ValidationFeedbackDecision,
} from '../types/ValidationFeedbackTypes.js';

export class ValidationFeedbackMapper {
  public map(parsedIssues: ParsedValidationIssue[]): ValidationFeedbackDecision {
    if (parsedIssues.length === 0) {
      return {
        action: 'none',
        reason: 'No validation issues detected.',
        retryable: false,
        replanAllowed: false,
      };
    }

    const errorIssues = parsedIssues.filter((issue) => issue.severity === 'error');

    if (errorIssues.length === 0) {
      return {
        action: 'inspect_related_files',
        reason:
          'Only non-error validation issues were found. Inspect related files before editing.',
        retryable: false,
        replanAllowed: false,
      };
    }

    if (errorIssues.some((issue) => issue.category === 'validation_skipped')) {
      return {
        action: 'block',
        reason: 'Validation was skipped. Runtime cannot safely infer a fix from skipped execution.',
        retryable: false,
        replanAllowed: false,
      };
    }

    if (errorIssues.some((issue) => issue.category === 'typescript_config_error')) {
      return {
        action: 'block',
        reason: 'TypeScript configuration error requires explicit user review.',
        retryable: false,
        replanAllowed: false,
      };
    }

    if (
      errorIssues.some((issue) => {
        return (
          issue.category === 'typescript_type_error' ||
          issue.category === 'typescript_import_error' ||
          issue.category === 'lint_rule_violation'
        );
      })
    ) {
      return {
        action: 'inspect_related_files',
        reason:
          'Validation failed in code. Retrieve affected and related files before planning a fix.',
        retryable: false,
        replanAllowed: true,
      };
    }

    return {
      action: 'replan',
      reason: 'Validation failed and requires a safer corrective plan.',
      retryable: false,
      replanAllowed: true,
    };
  }
}
