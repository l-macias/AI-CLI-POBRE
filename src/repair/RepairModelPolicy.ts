import { ModelBudgetController } from '../providers/ModelBudgetController.js';
import { ProviderStrategy } from '../providers/ProviderStrategy.js';
import type { ProviderStrategyConfig } from '../types/ProviderStrategyTypes.js';
import type {
  RepairModelPolicyDecision,
  RepairModelPolicyDecisionStatus,
  RepairModelPolicyInput,
  RepairModelPolicyIssue,
} from '../types/RepairModelPolicyTypes.js';
import { RepairCostEstimator } from './RepairCostEstimator.js';

export interface RepairModelPolicyOptions {
  estimator?: RepairCostEstimator | undefined;
  budgetController?: ModelBudgetController | undefined;
  strategy?: ProviderStrategy | undefined;
}

export class RepairModelPolicy {
  private readonly estimator: RepairCostEstimator;
  private readonly budgetController: ModelBudgetController;
  private readonly strategy: ProviderStrategy;

  public constructor(options: RepairModelPolicyOptions = {}) {
    this.estimator = options.estimator ?? new RepairCostEstimator();
    this.budgetController = options.budgetController ?? new ModelBudgetController();
    this.strategy =
      options.strategy ??
      new ProviderStrategy({
        config: this.createDefaultRepairStrategy(),
      });
  }

  public evaluate(input: RepairModelPolicyInput): RepairModelPolicyDecision {
    if (input.provider === 'static' || input.provider === 'fake-llm') {
      return this.evaluateLocalProvider(input);
    }

    const selection = this.strategy.select({
      role: 'repair',
      riskLevel: input.riskLevel,
      requestedModel: input.requestedModel,
      allowPremium: input.allowPremium,
    });

    const estimate = this.estimator.estimate({
      provider: selection.provider,
      model: selection.model,
      prompt: input.prompt,
      estimatedCompletionTokens: input.estimatedCompletionTokens,
    });

    const budget = this.budgetController.check({
      selection,
      estimatedPromptTokens: estimate.promptTokens,
      estimatedCompletionTokens: estimate.completionTokens,
      premiumApproved: input.premiumApproved,
    });

    const issues = budget.issues.map((issue): RepairModelPolicyIssue => {
      return {
        code: issue.code,
        message: issue.message,
        severity: issue.severity,
      };
    });

    const hasErrors = issues.some((issue) => issue.severity === 'error');

    return {
      allowed: !hasErrors,
      status: hasErrors ? 'blocked' : this.resolveWarningStatus(issues),
      provider: input.provider,
      selectedProvider: selection.provider,
      selectedModel: selection.model,
      estimate,
      requiresPremiumApproval: budget.requiresPremiumApproval,
      issues,
      checkedAt: new Date().toISOString(),
    };
  }

  private evaluateLocalProvider(input: RepairModelPolicyInput): RepairModelPolicyDecision {
    const estimate = this.estimator.estimate({
      provider: input.provider,
      model:
        input.provider === 'fake-llm' ? 'fake-repair-proposal-provider' : 'static-repair-proposal',
      prompt: input.prompt,
      estimatedCompletionTokens: 0,
    });

    return {
      allowed: true,
      status: 'allowed',
      provider: input.provider,
      selectedProvider: input.provider,
      selectedModel: estimate.model,
      estimate: {
        ...estimate,
        estimatedUsd: 0,
      },
      requiresPremiumApproval: false,
      issues: [
        {
          code: 'LOCAL_REPAIR_PROVIDER',
          message: `${input.provider} is local/non-paid and does not require external model budget approval.`,
          severity: 'info',
        },
      ],
      checkedAt: new Date().toISOString(),
    };
  }

  private resolveWarningStatus(
    issues: readonly RepairModelPolicyIssue[],
  ): RepairModelPolicyDecisionStatus {
    if (issues.some((issue) => issue.severity === 'warning')) {
      return 'warning';
    }

    return 'allowed';
  }

  private createDefaultRepairStrategy(): ProviderStrategyConfig {
    return {
      defaultProvider: 'openrouter',
      roles: [
        {
          role: 'planner',
          provider: 'openrouter',
          model: 'openai/gpt-oss-120b:free',
          tier: 'free',
          fallbackModels: ['openai/gpt-4o-mini'],
          allowPremium: false,
        },
        {
          role: 'retriever',
          provider: 'openrouter',
          model: 'openai/gpt-oss-120b:free',
          tier: 'free',
          fallbackModels: ['openai/gpt-4o-mini'],
          allowPremium: false,
        },
        {
          role: 'coder',
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          tier: 'cheap',
          fallbackModels: ['openai/gpt-oss-120b:free'],
          allowPremium: false,
        },
        {
          role: 'reviewer',
          provider: 'openrouter',
          model: 'openai/gpt-4o-mini',
          tier: 'cheap',
          fallbackModels: ['openai/gpt-oss-120b:free'],
          allowPremium: false,
        },
        {
          role: 'repair',
          provider: 'openrouter',
          model: 'openai/gpt-oss-120b:free',
          tier: 'free',
          fallbackModels: ['openai/gpt-4o-mini'],
          allowPremium: false,
        },
      ],
    };
  }
}
