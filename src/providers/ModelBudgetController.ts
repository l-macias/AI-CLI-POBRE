import type {
  CostBudgetLimit,
  ModelBudgetCheckInput,
  ModelBudgetDecision,
  TokenBudgetLimit,
} from '../types/ModelBudgetTypes.js';
import { CostBudget } from './CostBudget.js';
import { FreeModelFirstPolicy } from './FreeModelFirstPolicy.js';
import { ModelEscalationGuard } from './ModelEscalationGuard.js';
import { ModelPricingCatalog } from './ModelPricingCatalog.js';
import { PremiumApprovalGate } from './PremiumApprovalGate.js';
import { TokenBudget } from './TokenBudget.js';

export interface ModelBudgetControllerOptions {
  tokenLimit?: TokenBudgetLimit | undefined;
  costLimit?: CostBudgetLimit | undefined;
  pricingCatalog?: ModelPricingCatalog | undefined;
  escalationGuard?: ModelEscalationGuard | undefined;
  freeModelFirstPolicy?: FreeModelFirstPolicy | undefined;
  premiumApprovalGate?: PremiumApprovalGate | undefined;
}

const defaultTokenLimit: TokenBudgetLimit = {
  maxPromptTokens: 8_000,
  maxCompletionTokens: 2_000,
  maxTotalTokens: 10_000,
};

const defaultCostLimit: CostBudgetLimit = {
  maxEstimatedUsd: 0.05,
  maxSessionUsd: 1,
};

export class ModelBudgetController {
  private readonly tokenBudget: TokenBudget;
  private readonly costBudget: CostBudget;
  private readonly pricingCatalog: ModelPricingCatalog;
  private readonly escalationGuard: ModelEscalationGuard;
  private readonly freeModelFirstPolicy: FreeModelFirstPolicy;
  private readonly premiumApprovalGate: PremiumApprovalGate;

  public constructor(options: ModelBudgetControllerOptions = {}) {
    this.tokenBudget = new TokenBudget(options.tokenLimit ?? defaultTokenLimit);
    this.costBudget = new CostBudget(options.costLimit ?? defaultCostLimit);
    this.pricingCatalog = options.pricingCatalog ?? new ModelPricingCatalog();
    this.escalationGuard = options.escalationGuard ?? new ModelEscalationGuard();
    this.freeModelFirstPolicy = options.freeModelFirstPolicy ?? new FreeModelFirstPolicy();
    this.premiumApprovalGate = options.premiumApprovalGate ?? new PremiumApprovalGate();
  }

  public check(input: ModelBudgetCheckInput): ModelBudgetDecision {
    const estimatedCost = this.pricingCatalog.estimate({
      provider: input.selection.provider,
      model: input.selection.model,
      promptTokens: input.estimatedPromptTokens,
      completionTokens: input.estimatedCompletionTokens,
    });

    const issues = [
      ...this.tokenBudget.check({
        promptTokens: input.estimatedPromptTokens,
        completionTokens: input.estimatedCompletionTokens,
      }),
      ...this.costBudget.checkEstimate(estimatedCost),
      ...this.escalationGuard.check(input.selection),
      ...this.premiumApprovalGate.check({
        selection: input.selection,
        premiumApproved: input.premiumApproved ?? false,
      }),
      ...this.freeModelFirstPolicy.check(input.selection),
    ];

    const hasError = issues.some((issue) => issue.severity === 'error');

    return {
      allowed: !hasError,
      requiresPremiumApproval: issues.some((issue) => {
        return issue.code === 'PREMIUM_APPROVAL_REQUIRED';
      }),
      selection: input.selection,
      estimatedCost,
      issues,
      checkedAt: new Date().toISOString(),
    };
  }
}
