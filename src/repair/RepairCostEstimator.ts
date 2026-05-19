import { ModelPricingCatalog } from '../providers/ModelPricingCatalog.js';
import { TokenEstimator } from '../providers/TokenEstimator.js';
import type { RepairCostEstimate } from '../types/RepairModelPolicyTypes.js';

export interface RepairCostEstimatorInput {
  provider: string;
  model: string;
  prompt: string;
  expectedCompletionText?: string | undefined;
  estimatedCompletionTokens?: number | undefined;
}

export interface RepairCostEstimatorOptions {
  tokenEstimator?: TokenEstimator | undefined;
  pricingCatalog?: ModelPricingCatalog | undefined;
  defaultEstimatedCompletionTokens?: number | undefined;
}

export class RepairCostEstimator {
  private readonly tokenEstimator: TokenEstimator;
  private readonly pricingCatalog: ModelPricingCatalog;
  private readonly defaultEstimatedCompletionTokens: number;

  public constructor(options: RepairCostEstimatorOptions = {}) {
    this.tokenEstimator = options.tokenEstimator ?? new TokenEstimator();
    this.pricingCatalog = options.pricingCatalog ?? new ModelPricingCatalog();
    this.defaultEstimatedCompletionTokens = options.defaultEstimatedCompletionTokens ?? 1_200;
  }

  public estimate(input: RepairCostEstimatorInput): RepairCostEstimate {
    const promptTokens = this.tokenEstimator.estimateTextTokens(input.prompt);
    const completionTokens = this.resolveCompletionTokens(input);

    if (input.provider !== 'openrouter') {
      return {
        provider: input.provider,
        model: input.model,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedUsd: 0,
        pricingKnown: false,
      };
    }

    const cost = this.pricingCatalog.estimate({
      provider: 'openrouter',
      model: input.model,
      promptTokens,
      completionTokens,
    });

    return {
      provider: input.provider,
      model: input.model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedUsd: cost.estimatedUsd,
      pricingKnown: cost.pricingKnown,
    };
  }

  private resolveCompletionTokens(input: RepairCostEstimatorInput): number {
    if (typeof input.estimatedCompletionTokens === 'number') {
      return Math.max(0, Math.ceil(input.estimatedCompletionTokens));
    }

    if (typeof input.expectedCompletionText === 'string') {
      return this.tokenEstimator.estimateTextTokens(input.expectedCompletionText);
    }

    return this.defaultEstimatedCompletionTokens;
  }
}
