import { RuntimeTracer } from '../observability/RuntimeTracer.js';
import { ValidationOrchestrator } from '../validation/ValidationOrchestrator.js';
import { BenchmarkFixtureManager } from './BenchmarkFixtureManager.js';
import { BenchmarkMetricsCollector } from './BenchmarkMetricsCollector.js';
import type {
  BenchmarkCase,
  BenchmarkCaseResult,
  BenchmarkCaseStatus,
  BenchmarkIssue,
  BenchmarkRun,
} from '../types/BenchmarkTypes.js';

export interface BenchmarkRunnerOptions {
  tracer?: RuntimeTracer | undefined;
  fixtureManager?: BenchmarkFixtureManager | undefined;
  metricsCollector?: BenchmarkMetricsCollector | undefined;
  validationOrchestrator?: ValidationOrchestrator | undefined;
  runValidation?: boolean | undefined;
}

export class BenchmarkRunner {
  private readonly tracer: RuntimeTracer;
  private readonly fixtureManager: BenchmarkFixtureManager;
  private readonly metricsCollector: BenchmarkMetricsCollector;
  private readonly validationOrchestrator: ValidationOrchestrator;
  private readonly runValidation: boolean;

  public constructor(options: BenchmarkRunnerOptions = {}) {
    this.tracer = options.tracer ?? new RuntimeTracer();
    this.fixtureManager = options.fixtureManager ?? new BenchmarkFixtureManager();
    this.metricsCollector = options.metricsCollector ?? new BenchmarkMetricsCollector();
    this.validationOrchestrator = options.validationOrchestrator ?? new ValidationOrchestrator();
    this.runValidation = options.runValidation ?? true;
  }

  public async run(cases: readonly BenchmarkCase[]): Promise<BenchmarkRun> {
    const startedAt = new Date();
    const runId = this.createRunId(startedAt);

    this.tracer.startSession(runId);

    const results: BenchmarkCaseResult[] = [];

    for (const benchmarkCase of cases) {
      results.push(await this.runCase(benchmarkCase));
    }

    this.tracer.completeSession(runId);

    const finishedAt = new Date();
    const summary = this.metricsCollector.summarize(results);
    const status = this.resolveRunStatus(results.map((result) => result.status));

    return {
      id: runId,
      status,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      results,
      summary,
    };
  }

  private async runCase(benchmarkCase: BenchmarkCase): Promise<BenchmarkCaseResult> {
    const startedAt = new Date();
    const issues: BenchmarkIssue[] = [];
    let fixturePath = '';

    this.tracer.trace({
      type: 'custom',
      scope: 'execution',
      source: 'BenchmarkRunner',
      message: `Benchmark case "${benchmarkCase.input.id}" started.`,
      metadata: {
        caseId: benchmarkCase.input.id,
        name: benchmarkCase.input.name,
        category: benchmarkCase.input.category,
      },
    });

    try {
      fixturePath = await this.fixtureManager.prepare(benchmarkCase.input.fixture);

      const output = await benchmarkCase.run({
        caseId: benchmarkCase.input.id,
        fixturePath,
        startedAt: startedAt.toISOString(),
      });

      const validation = this.runValidation
        ? await this.validationOrchestrator.runAll()
        : undefined;

      const status: BenchmarkCaseStatus =
        validation && validation.status === 'failed' ? 'failed' : 'passed';

      const finishedAt = new Date();

      const result: BenchmarkCaseResult = {
        caseId: benchmarkCase.input.id,
        name: benchmarkCase.input.name,
        category: benchmarkCase.input.category,
        status,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        fixturePath,
        output,
        validation,
        issues,
        observability: this.tracer.summarizeMetrics(),
      };

      this.tracer.trace({
        type: 'custom',
        scope: 'execution',
        source: 'BenchmarkRunner',
        message: `Benchmark case "${benchmarkCase.input.id}" completed with status "${status}".`,
        metadata: {
          caseId: result.caseId,
          status: result.status,
          durationMs: result.durationMs,
          output: result.output,
        },
      });

      return result;
    } catch (error) {
      const finishedAt = new Date();

      issues.push({
        code: 'BENCHMARK_CASE_FAILED',
        message: error instanceof Error ? error.message : String(error),
        severity: 'error',
      });

      this.tracer.getErrorReporter().report({
        source: 'BenchmarkRunner',
        code: 'BENCHMARK_CASE_FAILED',
        error,
        metadata: {
          caseId: benchmarkCase.input.id,
        },
      });

      return {
        caseId: benchmarkCase.input.id,
        name: benchmarkCase.input.name,
        category: benchmarkCase.input.category,
        status: 'failed',
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        fixturePath,
        output: {
          stepsExecuted: 0,
          actionsBlocked: 0,
          approvalsRequired: 0,
          replans: 0,
          recoveries: 0,
        },
        issues,
        observability: this.tracer.summarizeMetrics(),
      };
    }
  }

  private resolveRunStatus(statuses: BenchmarkCaseStatus[]): BenchmarkCaseStatus {
    if (statuses.length === 0) {
      return 'skipped';
    }

    if (statuses.every((status) => status === 'passed')) {
      return 'passed';
    }

    if (statuses.some((status) => status === 'failed')) {
      return 'failed';
    }

    if (statuses.every((status) => status === 'skipped')) {
      return 'skipped';
    }

    return 'failed';
  }

  private createRunId(date: Date): string {
    return `benchmark-run-${date.toISOString().replaceAll(':', '').replaceAll('.', '')}`;
  }
}
