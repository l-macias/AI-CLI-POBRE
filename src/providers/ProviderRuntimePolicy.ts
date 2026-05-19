import { ProviderStrategy } from './ProviderStrategy.js';
import { ModelBudgetController } from './ModelBudgetController.js';
import { ProviderUsageLedger } from './ProviderUsageLedger.js';
import type { ProviderUsage } from '../types/ProviderTypes.js';
import type {
  ProviderRuntimePolicyDecision,
  ProviderRuntimePolicyInput,
  ProviderRuntimePolicySnapshot,
} from '../types/ProviderRuntimePolicyTypes.js';
import type { ProviderSelectionResult } from '../types/ProviderStrategyTypes.js';

export interface ProviderRuntimePolicyOptions {
  strategy?: ProviderStrategy | undefined;
  budgetController?: ModelBudgetController | undefined;
  usageLedger?: ProviderUsageLedger | undefined;
}

export class ProviderRuntimePolicy {
  private readonly strategy: ProviderStrategy;
  private readonly budgetController: ModelBudgetController;
  private readonly usageLedger: ProviderUsageLedger;

  public constructor(options: ProviderRuntimePolicyOptions = {}) {
    this.strategy = options.strategy ?? new ProviderStrategy();
    this.budgetController = options.budgetController ?? new ModelBudgetController();
    this.usageLedger = options.usageLedger ?? new ProviderUsageLedger();
  }

  public evaluate(input: ProviderRuntimePolicyInput): ProviderRuntimePolicyDecision {
    const selection = this.strategy.select({
      role: input.role,
      riskLevel: input.riskLevel,
      requestedModel: input.requestedModel,
      allowPremium: input.allowPremium,
    });

    const budget = this.budgetController.check({
      selection,
      estimatedPromptTokens: input.estimatedPromptTokens,
      estimatedCompletionTokens: input.estimatedCompletionTokens,
      premiumApproved: input.premiumApproved,
    });

    return {
      allowed: budget.allowed,
      selection,
      budget,
      auditLog: this.strategy.getAuditLog(),
    };
  }

  public recordUsage(input: {
    selection: ProviderSelectionResult;
    usage: ProviderUsage;
    reason: string;
  }): void {
    this.usageLedger.record(input);
  }

  public snapshot(): ProviderRuntimePolicySnapshot {
    return {
      auditLog: this.strategy.getAuditLog(),
      usageSummary: this.usageLedger.summarize(),
    };
  }
}
