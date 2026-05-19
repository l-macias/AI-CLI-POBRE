import { CostTracker } from './CostTracker.js';
import { DecisionLogViewer } from './DecisionLogViewer.js';
import { ErrorReporter } from './ErrorReporter.js';
import { ExecutionTimeline } from './ExecutionTimeline.js';
import { Logger } from './Logger.js';
import { MetricsCollector } from './MetricsCollector.js';
import { PerformanceProfiler } from './PerformanceProfiler.js';
import { SensitiveDataRedactor } from './SensitiveDataRedactor.js';
import { TokenUsageTracker } from './TokenUsageTracker.js';
import type { ToolExecutionResult } from '../types/ToolTypes.js';
import type {
  RuntimeMetricsSummary,
  RuntimeModelUsageMetric,
  RuntimeTraceEvent,
  RuntimeTraceInput,
} from '../types/ObservabilityTypes.js';

export interface RuntimeTracerOptions {
  logger?: Logger | undefined;
  redactor?: SensitiveDataRedactor | undefined;
  metrics?: MetricsCollector | undefined;
  timeline?: ExecutionTimeline | undefined;
  tokenUsage?: TokenUsageTracker | undefined;
  costTracker?: CostTracker | undefined;
  performance?: PerformanceProfiler | undefined;
  errors?: ErrorReporter | undefined;
  decisions?: DecisionLogViewer | undefined;
}

export class RuntimeTracer {
  private readonly events: RuntimeTraceEvent[] = [];
  private readonly logger: Logger;
  private readonly redactor: SensitiveDataRedactor;
  private readonly metrics: MetricsCollector;
  private readonly timeline: ExecutionTimeline;
  private readonly tokenUsage: TokenUsageTracker;
  private readonly costTracker: CostTracker;
  private readonly performance: PerformanceProfiler;
  private readonly errors: ErrorReporter;
  private readonly decisions: DecisionLogViewer;

  public constructor(options: RuntimeTracerOptions = {}) {
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
    this.logger =
      options.logger ??
      new Logger({
        namespace: 'zero-runtime:runtime-tracer',
        level: 'info',
        redactor: this.redactor,
      });
    this.metrics = options.metrics ?? new MetricsCollector();
    this.timeline = options.timeline ?? new ExecutionTimeline({ redactor: this.redactor });
    this.tokenUsage = options.tokenUsage ?? new TokenUsageTracker();
    this.costTracker = options.costTracker ?? new CostTracker();
    this.performance = options.performance ?? new PerformanceProfiler({ redactor: this.redactor });
    this.errors = options.errors ?? new ErrorReporter({ redactor: this.redactor });
    this.decisions = options.decisions ?? new DecisionLogViewer({ redactor: this.redactor });
  }

  public startSession(sessionId: string): RuntimeTraceEvent {
    this.metrics.startSession(sessionId);

    return this.trace({
      type: 'session_started',
      scope: 'session',
      source: 'RuntimeTracer',
      message: `Session "${sessionId}" started.`,
      metadata: {
        sessionId,
      },
    });
  }

  public completeSession(sessionId: string): RuntimeTraceEvent {
    const session = this.metrics.completeSession(sessionId);

    return this.trace({
      type: 'session_completed',
      scope: 'session',
      source: 'RuntimeTracer',
      message: `Session "${sessionId}" completed.`,
      metadata: session,
    });
  }

  public startLoop(loopId: string): RuntimeTraceEvent {
    this.metrics.startLoop(loopId);

    return this.trace({
      type: 'loop_started',
      scope: 'loop',
      source: 'RuntimeTracer',
      message: `Loop "${loopId}" started.`,
      metadata: {
        loopId,
      },
    });
  }

  public completeLoop(input: {
    loopId: string;
    status: string;
    executedSteps?: number | undefined;
    blockedSteps?: number | undefined;
    failedSteps?: number | undefined;
    recoveryCount?: number | undefined;
  }): RuntimeTraceEvent {
    const loop = this.metrics.completeLoop(input);

    return this.trace({
      type: 'loop_completed',
      scope: 'loop',
      source: 'RuntimeTracer',
      message: `Loop "${input.loopId}" completed with status "${input.status}".`,
      metadata: loop,
    });
  }

  public recordModelUsage(metric: RuntimeModelUsageMetric): RuntimeTraceEvent {
    this.metrics.recordModelUsage(metric);
    this.tokenUsage.record(metric);
    this.costTracker.record(metric);

    return this.trace({
      type: 'model_usage_recorded',
      scope: 'model',
      source: 'RuntimeTracer',
      message: `Model usage recorded for "${metric.model}".`,
      metadata: metric,
    });
  }

  public recordToolResult(result: ToolExecutionResult): RuntimeTraceEvent {
    this.metrics.recordToolResult(result);

    const type =
      result.status === 'failed'
        ? 'tool_failed'
        : result.status === 'not_executed'
          ? 'tool_blocked'
          : 'tool_executed';

    const severity =
      result.status === 'failed' ? 'error' : result.status === 'not_executed' ? 'warn' : 'info';

    return this.trace({
      type,
      scope: 'tool',
      source: 'RuntimeTracer',
      severity,
      message: `Tool "${result.toolName}" finished with status "${result.status}".`,
      metadata: result,
    });
  }

  public trace(input: RuntimeTraceInput): RuntimeTraceEvent {
    const timestamp = new Date().toISOString();

    const event: RuntimeTraceEvent = {
      id: `trace-${timestamp.replaceAll(':', '').replaceAll('.', '')}-${this.events.length + 1}`,
      type: input.type,
      scope: input.scope,
      source: input.source,
      severity: input.severity ?? 'info',
      timestamp,
      message: input.message,
    };

    if (typeof input.metadata !== 'undefined') {
      event.metadata = this.redactor.redactObject(input.metadata);
    }

    this.events.push(event);
    this.metrics.recordEvent(event);
    this.writeLog(event);

    return event;
  }

  public getTimeline(): ExecutionTimeline {
    return this.timeline;
  }

  public getPerformanceProfiler(): PerformanceProfiler {
    return this.performance;
  }

  public getErrorReporter(): ErrorReporter {
    return this.errors;
  }

  public getDecisionLogViewer(): DecisionLogViewer {
    return this.decisions;
  }

  public listEvents(): RuntimeTraceEvent[] {
    return [...this.events];
  }

  public summarizeMetrics(): RuntimeMetricsSummary {
    return this.metrics.summarize();
  }

  public clear(): void {
    this.events.length = 0;
    this.metrics.clear();
    this.timeline.clear();
    this.tokenUsage.clear();
    this.costTracker.clear();
    this.performance.clear();
    this.errors.clear();
    this.decisions.clear();
  }

  private writeLog(event: RuntimeTraceEvent): void {
    const meta = {
      eventId: event.id,
      type: event.type,
      scope: event.scope,
      source: event.source,
      metadata: event.metadata ?? {},
    };

    if (event.severity === 'error') {
      this.logger.error(event.message, meta);
      return;
    }

    if (event.severity === 'warn') {
      this.logger.warn(event.message, meta);
      return;
    }

    if (event.severity === 'debug') {
      this.logger.debug(event.message, meta);
      return;
    }

    this.logger.info(event.message, meta);
  }
}
