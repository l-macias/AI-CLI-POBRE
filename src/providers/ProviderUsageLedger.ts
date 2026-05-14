import type {
  ProviderUsageLedgerEntry,
  ProviderUsageLedgerSummary,
} from '../types/ModelBudgetTypes.js';
import type { ProviderUsage } from '../types/ProviderTypes.js';
import type { ProviderSelectionResult } from '../types/ProviderStrategyTypes.js';
import { ModelPricingCatalog } from './ModelPricingCatalog.js';

export interface ProviderUsageLedgerOptions {
  pricingCatalog?: ModelPricingCatalog | undefined;
}

export class ProviderUsageLedger {
  private readonly entries: ProviderUsageLedgerEntry[] = [];
  private readonly pricingCatalog: ModelPricingCatalog;

  public constructor(options: ProviderUsageLedgerOptions = {}) {
    this.pricingCatalog = options.pricingCatalog ?? new ModelPricingCatalog();
  }

  public record(input: {
    selection: ProviderSelectionResult;
    usage: ProviderUsage;
    reason: string;
  }): ProviderUsageLedgerEntry {
    const promptTokens = input.usage.promptTokens ?? 0;
    const completionTokens = input.usage.completionTokens ?? 0;
    const estimate = this.pricingCatalog.estimate({
      provider: input.selection.provider,
      model: input.selection.model,
      promptTokens,
      completionTokens,
    });

    const entry: ProviderUsageLedgerEntry = {
      provider: input.selection.provider,
      model: input.selection.model,
      role: input.selection.role,
      tier: input.selection.tier,
      usage: input.usage,
      estimatedUsd: estimate.estimatedUsd,
      reason: input.reason,
      recordedAt: new Date().toISOString(),
    };

    this.entries.push(entry);

    return entry;
  }

  public summarize(): ProviderUsageLedgerSummary {
    const totalPromptTokens = this.entries.reduce((total, entry) => {
      return total + (entry.usage.promptTokens ?? 0);
    }, 0);

    const totalCompletionTokens = this.entries.reduce((total, entry) => {
      return total + (entry.usage.completionTokens ?? 0);
    }, 0);

    const totalTokens = this.entries.reduce((total, entry) => {
      return total + (entry.usage.totalTokens ?? 0);
    }, 0);

    const totalEstimatedUsd = this.entries.reduce((total, entry) => {
      return total + entry.estimatedUsd;
    }, 0);

    return {
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      totalEstimatedUsd: Number(totalEstimatedUsd.toFixed(8)),
      entries: [...this.entries],
    };
  }

  public clear(): void {
    this.entries.length = 0;
  }
}
