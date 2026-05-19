import type {
  CostUsageRecord,
  CostUsageSummary,
  RuntimeModelUsageMetric,
} from '../types/ObservabilityTypes.js';

export class CostTracker {
  private readonly records: CostUsageRecord[] = [];

  public record(metric: RuntimeModelUsageMetric): CostUsageRecord {
    const record: CostUsageRecord = {
      provider: metric.provider,
      model: metric.model,
      role: metric.role,
      estimatedUsd: metric.estimatedUsd,
      recordedAt: metric.recordedAt,
    };

    this.records.push(record);

    return record;
  }

  public summarize(): CostUsageSummary {
    const totalEstimatedUsd = this.records.reduce((total, record) => {
      return total + record.estimatedUsd;
    }, 0);

    return {
      totalEstimatedUsd: Number(totalEstimatedUsd.toFixed(8)),
      byModel: [...this.records],
    };
  }

  public clear(): void {
    this.records.length = 0;
  }
}
