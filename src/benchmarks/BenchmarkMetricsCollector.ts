import type { BenchmarkCaseResult, BenchmarkRunSummary } from '../types/BenchmarkTypes.js';

export class BenchmarkMetricsCollector {
  public summarize(results: BenchmarkCaseResult[]): BenchmarkRunSummary {
    const passed = results.filter((result) => result.status === 'passed').length;
    const failed = results.filter((result) => result.status === 'failed').length;
    const skipped = results.filter((result) => result.status === 'skipped').length;
    const totalCases = results.length;

    const successRate = totalCases === 0 ? 0 : Number((passed / totalCases).toFixed(4));

    return {
      totalCases,
      passed,
      failed,
      skipped,
      successRate,
      totalDurationMs: results.reduce((total, result) => total + result.durationMs, 0),
      totalStepsExecuted: results.reduce((total, result) => total + result.output.stepsExecuted, 0),
      totalActionsBlocked: results.reduce(
        (total, result) => total + result.output.actionsBlocked,
        0,
      ),
      totalApprovalsRequired: results.reduce(
        (total, result) => total + result.output.approvalsRequired,
        0,
      ),
      totalReplans: results.reduce((total, result) => total + result.output.replans, 0),
      totalRecoveries: results.reduce((total, result) => total + result.output.recoveries, 0),
      totalPromptTokens: results.reduce(
        (total, result) => total + result.observability.totals.promptTokens,
        0,
      ),
      totalCompletionTokens: results.reduce(
        (total, result) => total + result.observability.totals.completionTokens,
        0,
      ),
      totalTokens: results.reduce(
        (total, result) => total + result.observability.totals.totalTokens,
        0,
      ),
      totalEstimatedUsd: Number(
        results
          .reduce((total, result) => total + result.observability.totals.estimatedUsd, 0)
          .toFixed(8),
      ),
    };
  }
}
