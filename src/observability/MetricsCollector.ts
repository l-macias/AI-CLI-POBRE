import type { ToolExecutionResult } from '../types/ToolTypes.js';
import type {
  RuntimeLoopMetric,
  RuntimeMetricsSummary,
  RuntimeModelUsageMetric,
  RuntimeSessionMetric,
  RuntimeToolMetric,
  RuntimeTraceEvent,
} from '../types/ObservabilityTypes.js';

export class MetricsCollector {
  private readonly sessions = new Map<string, RuntimeSessionMetric>();
  private readonly loops = new Map<string, RuntimeLoopMetric>();
  private readonly modelUsage: RuntimeModelUsageMetric[] = [];
  private readonly tools: RuntimeToolMetric[] = [];
  private eventCount = 0;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public recordEvent(_event: RuntimeTraceEvent): void {
    this.eventCount += 1;
  }

  public startSession(sessionId: string): RuntimeSessionMetric {
    const timestamp = new Date().toISOString();

    const metric: RuntimeSessionMetric = {
      sessionId,
      startedAt: timestamp,
      loopCount: 0,
      toolExecutions: 0,
      blockedActions: 0,
      failedActions: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      totalEstimatedUsd: 0,
    };

    this.sessions.set(sessionId, metric);

    return metric;
  }

  public completeSession(sessionId: string): RuntimeSessionMetric {
    const metric = this.requireSession(sessionId);
    const completedAt = new Date().toISOString();

    const updated: RuntimeSessionMetric = {
      ...metric,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(metric.startedAt).getTime(),
    };

    this.sessions.set(sessionId, updated);

    return updated;
  }

  public startLoop(loopId: string): RuntimeLoopMetric {
    const timestamp = new Date().toISOString();

    const metric: RuntimeLoopMetric = {
      loopId,
      status: 'started',
      startedAt: timestamp,
      executedSteps: 0,
      blockedSteps: 0,
      failedSteps: 0,
      recoveryCount: 0,
    };

    this.loops.set(loopId, metric);

    for (const session of this.sessions.values()) {
      this.sessions.set(session.sessionId, {
        ...session,
        loopCount: session.loopCount + 1,
      });
      break;
    }

    return metric;
  }

  public completeLoop(input: {
    loopId: string;
    status: string;
    executedSteps?: number | undefined;
    blockedSteps?: number | undefined;
    failedSteps?: number | undefined;
    recoveryCount?: number | undefined;
  }): RuntimeLoopMetric {
    const metric = this.requireLoop(input.loopId);
    const completedAt = new Date().toISOString();

    const updated: RuntimeLoopMetric = {
      ...metric,
      status: input.status,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(metric.startedAt).getTime(),
      executedSteps: input.executedSteps ?? metric.executedSteps,
      blockedSteps: input.blockedSteps ?? metric.blockedSteps,
      failedSteps: input.failedSteps ?? metric.failedSteps,
      recoveryCount: input.recoveryCount ?? metric.recoveryCount,
    };

    this.loops.set(input.loopId, updated);

    return updated;
  }

  public recordModelUsage(metric: RuntimeModelUsageMetric): RuntimeModelUsageMetric {
    this.modelUsage.push(metric);

    for (const session of this.sessions.values()) {
      this.sessions.set(session.sessionId, {
        ...session,
        totalPromptTokens: session.totalPromptTokens + metric.promptTokens,
        totalCompletionTokens: session.totalCompletionTokens + metric.completionTokens,
        totalTokens: session.totalTokens + metric.totalTokens,
        totalEstimatedUsd: Number((session.totalEstimatedUsd + metric.estimatedUsd).toFixed(8)),
      });
      break;
    }

    return metric;
  }

  public recordToolResult(result: ToolExecutionResult): RuntimeToolMetric {
    const metric: RuntimeToolMetric = {
      toolName: result.toolName,
      status: result.status,
      durationMs: result.durationMs,
      issueCount: result.issues.length,
      recordedAt: result.executedAt,
    };

    this.tools.push(metric);

    for (const session of this.sessions.values()) {
      this.sessions.set(session.sessionId, {
        ...session,
        toolExecutions: session.toolExecutions + 1,
        blockedActions:
          result.status === 'not_executed' ? session.blockedActions + 1 : session.blockedActions,
        failedActions:
          result.status === 'failed' ? session.failedActions + 1 : session.failedActions,
      });
      break;
    }

    return metric;
  }

  public summarize(): RuntimeMetricsSummary {
    const totalEstimatedUsd = this.modelUsage.reduce((total, record) => {
      return total + record.estimatedUsd;
    }, 0);

    return {
      sessions: [...this.sessions.values()],
      loops: [...this.loops.values()],
      modelUsage: [...this.modelUsage],
      tools: [...this.tools],
      totals: {
        events: this.eventCount,
        loops: this.loops.size,
        toolExecutions: this.tools.length,
        blockedActions: this.tools.filter((tool) => tool.status === 'not_executed').length,
        failedActions: this.tools.filter((tool) => tool.status === 'failed').length,
        promptTokens: this.modelUsage.reduce((total, record) => {
          return total + record.promptTokens;
        }, 0),
        completionTokens: this.modelUsage.reduce((total, record) => {
          return total + record.completionTokens;
        }, 0),
        totalTokens: this.modelUsage.reduce((total, record) => {
          return total + record.totalTokens;
        }, 0),
        estimatedUsd: Number(totalEstimatedUsd.toFixed(8)),
        durationMs: this.tools.reduce((total, tool) => {
          return total + tool.durationMs;
        }, 0),
      },
    };
  }

  public clear(): void {
    this.sessions.clear();
    this.loops.clear();
    this.modelUsage.length = 0;
    this.tools.length = 0;
    this.eventCount = 0;
  }

  private requireSession(sessionId: string): RuntimeSessionMetric {
    const metric = this.sessions.get(sessionId);

    if (!metric) {
      throw new Error(`Session metric "${sessionId}" was not found.`);
    }

    return metric;
  }

  private requireLoop(loopId: string): RuntimeLoopMetric {
    const metric = this.loops.get(loopId);

    if (!metric) {
      throw new Error(`Loop metric "${loopId}" was not found.`);
    }

    return metric;
  }
}
