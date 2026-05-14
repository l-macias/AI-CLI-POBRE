import type {
  ValidationIssue,
  ValidationRun,
  ValidationStatus,
  ValidationSummary,
} from '../types/ValidationTypes.js';

export class ValidationReporter {
  public summarize(run: ValidationRun): ValidationSummary {
    const passed = run.results.filter((result) => result.status === 'passed').length;
    const failed = run.results.filter((result) => result.status === 'failed').length;
    const skipped = run.results.filter((result) => result.status === 'skipped').length;
    const issues = run.results.flatMap((result) => result.issues);

    return {
      runId: run.id,
      status: run.status,
      total: run.results.length,
      passed,
      failed,
      skipped,
      issues,
    };
  }

  public toMarkdown(run: ValidationRun): string {
    const summary = this.summarize(run);

    return `# Validation Report

## Summary

- Run ID: ${summary.runId}
- Status: ${summary.status}
- Total validators: ${String(summary.total)}
- Passed: ${String(summary.passed)}
- Failed: ${String(summary.failed)}
- Skipped: ${String(summary.skipped)}

## Results

${run.results
  .map((result) => {
    return `### ${result.target.label}

- Kind: ${result.target.kind}
- Command: ${result.target.command}
- Status: ${result.status}
- Duration: ${String(result.durationMs)}ms

${this.renderIssues(result.issues)}`;
  })
  .join('\n\n')}
`;
  }

  public resolveRunStatus(statuses: ValidationStatus[]): ValidationStatus {
    if (statuses.includes('failed')) {
      return 'failed';
    }

    if (statuses.length > 0 && statuses.every((status) => status === 'passed')) {
      return 'passed';
    }

    return 'skipped';
  }

  private renderIssues(issues: ValidationIssue[]): string {
    if (issues.length === 0) {
      return 'No issues.';
    }

    return issues
      .map((issue) => {
        const source = issue.source ? `\n  - Source: ${issue.source}` : '';

        return `- ${issue.severity.toUpperCase()}: ${issue.code}
  - Message: ${issue.message}${source}`;
      })
      .join('\n');
  }
}
