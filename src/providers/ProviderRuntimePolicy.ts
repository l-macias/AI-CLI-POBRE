import { ProviderStrategy } from './ProviderStrategy.js';
import { ModelBudgetController } from './ModelBudgetController.js';
import { ProviderUsageLedger } from './ProviderUsageLedger.js';
import { ModelRoutingPolicy } from './ModelRoutingPolicy.js';
import type { ProviderUsage } from '../types/ProviderTypes.js';
import type {
  ProviderFallbackDecision,
  ProviderFallbackEvaluationAttempt,
  ProviderRuntimePolicyDecision,
  ProviderRuntimePolicyInput,
  ProviderRuntimePolicySnapshot,
  ProviderRoutingDecision,
} from '../types/ProviderRuntimePolicyTypes.js';
import type { ProviderSelectionResult } from '../types/ProviderStrategyTypes.js';
import type { ModelBudgetDecision } from '../types/ModelBudgetTypes.js';

export interface ProviderRuntimePolicyOptions {
  strategy?: ProviderStrategy | undefined;
  budgetController?: ModelBudgetController | undefined;
  usageLedger?: ProviderUsageLedger | undefined;
  routingPolicy?: ModelRoutingPolicy | undefined;
}

interface SelectionWithBudget {
  selection: ProviderSelectionResult;
  budget: ModelBudgetDecision;
}

export class ProviderRuntimePolicy {
  private readonly strategy: ProviderStrategy;
  private readonly budgetController: ModelBudgetController;
  private readonly usageLedger: ProviderUsageLedger;
  private readonly routingPolicy: ModelRoutingPolicy;

  public constructor(options: ProviderRuntimePolicyOptions = {}) {
    this.strategy = options.strategy ?? new ProviderStrategy();
    this.budgetController = options.budgetController ?? new ModelBudgetController();
    this.usageLedger = options.usageLedger ?? new ProviderUsageLedger();
    this.routingPolicy = options.routingPolicy ?? new ModelRoutingPolicy();
  }

  public evaluate(input: ProviderRuntimePolicyInput): ProviderRuntimePolicyDecision {
    const routing = this.routingPolicy.route({
      role: input.role,
      riskLevel: input.riskLevel,
      estimatedPromptTokens: input.estimatedPromptTokens,
      estimatedCompletionTokens: input.estimatedCompletionTokens,
      requestedModel: input.requestedModel,
      requestedProfile: input.requestedProfile,
      allowPremium: input.allowPremium,
      precisionRequirement: input.precisionRequirement,
    });

    const primary = this.selectAndCheck({
      input,
      requestedModel: input.requestedModel,
      requestedProfile: routing.selectedProfile ?? input.requestedProfile,
      routingReasons: routing.reasons,
    });

    if (primary.budget.allowed) {
      return {
        allowed: true,
        selection: primary.selection,
        routing,
        budget: primary.budget,
        fallback: this.createNoFallbackDecision(primary.selection.model),
        auditLog: this.strategy.getAuditLog(),
      };
    }

    const fallbackResult = this.evaluateFallback({
      input,
      routing,
      primary,
    });

    return {
      allowed: fallbackResult.selected?.budget.allowed ?? false,
      selection: fallbackResult.selected?.selection ?? primary.selection,
      routing,
      budget: fallbackResult.selected?.budget ?? primary.budget,
      fallback: fallbackResult.fallback,
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

  private selectAndCheck(input: {
    input: ProviderRuntimePolicyInput;
    requestedModel?: string | undefined;
    requestedProfile?: ProviderRuntimePolicyInput['requestedProfile'] | undefined;
    routingReasons: string[];
  }): SelectionWithBudget {
    const selection = this.strategy.select({
      role: input.input.role,
      riskLevel: input.input.riskLevel,
      requestedModel: input.requestedModel,
      requestedProfile: input.requestedProfile,
      allowPremium: input.input.allowPremium,
      precisionRequirement: input.input.precisionRequirement,
      routingReasons: input.routingReasons,
    });

    const budget = this.budgetController.check({
      selection,
      estimatedPromptTokens: input.input.estimatedPromptTokens,
      estimatedCompletionTokens: input.input.estimatedCompletionTokens,
      premiumApproved: input.input.premiumApproved,
    });

    return {
      selection,
      budget,
    };
  }

  private evaluateFallback(input: {
    input: ProviderRuntimePolicyInput;
    routing: ProviderRoutingDecision;
    primary: SelectionWithBudget;
  }): {
    selected?: SelectionWithBudget | undefined;
    fallback: ProviderFallbackDecision;
  } {
    const attempts: ProviderFallbackEvaluationAttempt[] = [];
    const originalModel = input.primary.selection.model;
    const fallbackModels = input.primary.selection.fallbackModels;

    if (fallbackModels.length === 0) {
      return {
        fallback: {
          used: false,
          originalModel,
          selectedModel: originalModel,
          reason: 'Primary selection was blocked and no fallback models were configured.',
          attempts,
        },
      };
    }

    for (const fallbackModel of fallbackModels) {
      if (this.isPremiumModel(fallbackModel) && !this.canUsePremiumFallback(input.input)) {
        attempts.push({
          model: fallbackModel,
          selected: false,
          allowed: false,
          skipped: true,
          reason:
            'Skipped premium fallback because premium was not explicitly allowed and approved.',
        });
        continue;
      }

      const evaluated = this.selectAndCheck({
        input: input.input,
        requestedModel: fallbackModel,
        requestedProfile: undefined,
        routingReasons: [
          ...input.routing.reasons,
          `Fallback candidate evaluated after primary model was blocked: ${fallbackModel}.`,
        ],
      });

      attempts.push({
        model: fallbackModel,
        selected: evaluated.budget.allowed,
        allowed: evaluated.budget.allowed,
        skipped: false,
        reason: evaluated.budget.allowed
          ? 'Fallback model passed runtime budget and approval policy.'
          : `Fallback model blocked: ${this.formatBudgetIssues(evaluated.budget)}`,
      });

      if (evaluated.budget.allowed) {
        return {
          selected: evaluated,
          fallback: {
            used: true,
            originalModel,
            selectedModel: evaluated.selection.model,
            reason: `Primary model "${originalModel}" was blocked. Selected safe fallback "${evaluated.selection.model}".`,
            attempts,
          },
        };
      }
    }

    return {
      fallback: {
        used: false,
        originalModel,
        selectedModel: originalModel,
        reason: `Primary model "${originalModel}" was blocked and no fallback candidate passed runtime policy.`,
        attempts,
      },
    };
  }

  private createNoFallbackDecision(model: string): ProviderFallbackDecision {
    return {
      used: false,
      originalModel: model,
      selectedModel: model,
      reason: 'Primary provider selection passed runtime policy; fallback was not needed.',
      attempts: [],
    };
  }

  private canUsePremiumFallback(input: ProviderRuntimePolicyInput): boolean {
    return input.allowPremium === true && input.premiumApproved === true;
  }

  private isPremiumModel(model: string): boolean {
    const normalized = model.toLowerCase();

    return (
      normalized.includes('gpt-5') || normalized.includes('opus') || normalized.includes('premium')
    );
  }

  private formatBudgetIssues(decision: ModelBudgetDecision): string {
    const blockingIssues = decision.issues.filter((issue) => issue.severity === 'error');

    if (blockingIssues.length === 0) {
      return 'unknown non-blocking policy issue';
    }

    return blockingIssues.map((issue) => `${issue.code}: ${issue.message}`).join('; ');
  }
}
