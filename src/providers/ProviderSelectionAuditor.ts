import type {
  ProviderSelectionAuditEntry,
  ProviderSelectionResult,
} from '../types/ProviderStrategyTypes.js';

export class ProviderSelectionAuditor {
  private readonly entries: ProviderSelectionAuditEntry[] = [];

  public record(selection: ProviderSelectionResult): void {
    this.entries.push({
      role: selection.role,
      provider: selection.provider,
      model: selection.model,
      tier: selection.tier,
      riskLevel: selection.riskLevel,
      premiumSelected: selection.premiumSelected,
      reason: selection.reason,
      selectedAt: selection.selectedAt,
    });
  }

  public list(): ProviderSelectionAuditEntry[] {
    return [...this.entries];
  }

  public clear(): void {
    this.entries.length = 0;
  }
}
