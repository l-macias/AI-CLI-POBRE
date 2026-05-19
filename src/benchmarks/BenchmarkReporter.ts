import type {
  BenchmarkCaseExecutionOutput,
  BenchmarkIssue,
  BenchmarkReporterOutput,
  BenchmarkRun,
} from '../types/BenchmarkTypes.js';
import type { JsonObject } from '../types/SharedTypes.js';

export class BenchmarkReporter {
  public create(run: BenchmarkRun): BenchmarkReporterOutput {
    return {
      markdown: this.toMarkdown(run),
      json: this.toJson(run),
    };
  }

  public toMarkdown(run: BenchmarkRun): string {
    const rows = run.results
      .map((result) => {
        return `| ${result.caseId} | ${result.name} | ${result.category} | ${result.status} | ${result.durationMs}ms | ${result.output.stepsExecuted} | ${result.output.actionsBlocked} | ${result.output.recoveries} |`;
      })
      .join('\n');

    return `# Benchmark Report

## Run

- ID: ${run.id}
- Status: ${run.status}
- Duration: ${run.durationMs}ms
- Success rate: ${run.summary.successRate}

## Summary

- Total cases: ${run.summary.totalCases}
- Passed: ${run.summary.passed}
- Failed: ${run.summary.failed}
- Skipped: ${run.summary.skipped}
- Steps executed: ${run.summary.totalStepsExecuted}
- Actions blocked: ${run.summary.totalActionsBlocked}
- Approvals required: ${run.summary.totalApprovalsRequired}
- Replans: ${run.summary.totalReplans}
- Recoveries: ${run.summary.totalRecoveries}
- Tokens: ${run.summary.totalTokens}
- Estimated USD: ${run.summary.totalEstimatedUsd}

## Cases

| ID | Name | Category | Status | Duration | Steps | Blocked | Recoveries |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows}
`;
  }

  public toJson(run: BenchmarkRun): JsonObject {
    return {
      id: run.id,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      durationMs: run.durationMs,
      summary: {
        totalCases: run.summary.totalCases,
        passed: run.summary.passed,
        failed: run.summary.failed,
        skipped: run.summary.skipped,
        successRate: run.summary.successRate,
        totalDurationMs: run.summary.totalDurationMs,
        totalStepsExecuted: run.summary.totalStepsExecuted,
        totalActionsBlocked: run.summary.totalActionsBlocked,
        totalApprovalsRequired: run.summary.totalApprovalsRequired,
        totalReplans: run.summary.totalReplans,
        totalRecoveries: run.summary.totalRecoveries,
        totalPromptTokens: run.summary.totalPromptTokens,
        totalCompletionTokens: run.summary.totalCompletionTokens,
        totalTokens: run.summary.totalTokens,
        totalEstimatedUsd: run.summary.totalEstimatedUsd,
      },
      results: run.results.map((result) => ({
        caseId: result.caseId,
        name: result.name,
        category: result.category,
        status: result.status,
        durationMs: result.durationMs,
        fixturePath: result.fixturePath,
        output: this.outputToJson(result.output),
        issues: result.issues.map((issue) => this.issueToJson(issue)),
      })),
    };
  }

  private outputToJson(output: BenchmarkCaseExecutionOutput): JsonObject {
    const json: JsonObject = {
      stepsExecuted: output.stepsExecuted,
      actionsBlocked: output.actionsBlocked,
      approvalsRequired: output.approvalsRequired,
      replans: output.replans,
      recoveries: output.recoveries,
    };

    if (output.metadata) {
      json['metadata'] = output.metadata;
    }

    return json;
  }

  private issueToJson(issue: BenchmarkIssue): JsonObject {
    return {
      code: issue.code,
      message: issue.message,
      severity: issue.severity,
    };
  }
}
