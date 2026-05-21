import type {
  ProviderSelectionAuditEntry,
  ProviderSelectionResult,
} from '../types/ProviderStrategyTypes.js';

export class ProviderSelectionAuditor {
  private readonly entries: ProviderSelectionAuditEntry[] = [];

  public record(selection: ProviderSelectionResult): void {
    const entry: ProviderSelectionAuditEntry = {
      role: selection.role,
      provider: selection.provider,
      model: selection.model,
      tier: selection.tier,
      riskLevel: selection.riskLevel,
      premiumSelected: selection.premiumSelected,
      reason: selection.reason,
      routingReasons: selection.routingReasons ? [...selection.routingReasons] : [],
      selectedAt: selection.selectedAt,
    };

    if (selection.profile) {
      entry.profile = selection.profile;
    }

    this.entries.push(entry);
  }

  public list(): ProviderSelectionAuditEntry[] {
    return this.entries.map((entry) => ({
      ...entry,
      routingReasons: entry.routingReasons ? [...entry.routingReasons] : [],
    }));
  }

  public clear(): void {
    this.entries.length = 0;
  }
}
