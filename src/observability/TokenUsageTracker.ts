import type {
  RuntimeModelUsageMetric,
  TokenUsageRecord,
  TokenUsageSummary,
} from '../types/ObservabilityTypes.js';

export class TokenUsageTracker {
  private readonly records: TokenUsageRecord[] = [];

  public record(metric: RuntimeModelUsageMetric): TokenUsageRecord {
    const record: TokenUsageRecord = {
      provider: metric.provider,
      model: metric.model,
      role: metric.role,
      promptTokens: metric.promptTokens,
      completionTokens: metric.completionTokens,
      totalTokens: metric.totalTokens,
      recordedAt: metric.recordedAt,
    };

    this.records.push(record);

    return record;
  }

  public summarize(): TokenUsageSummary {
    return {
      totalPromptTokens: this.records.reduce((total, record) => {
        return total + record.promptTokens;
      }, 0),
      totalCompletionTokens: this.records.reduce((total, record) => {
        return total + record.completionTokens;
      }, 0),
      totalTokens: this.records.reduce((total, record) => {
        return total + record.totalTokens;
      }, 0),
      byModel: [...this.records],
    };
  }

  public clear(): void {
    this.records.length = 0;
  }
}
