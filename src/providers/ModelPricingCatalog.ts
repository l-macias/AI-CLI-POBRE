import type {
  ModelCostEstimate,
  ModelCostEstimateInput,
  ModelPricing,
} from '../types/ModelBudgetTypes.js';

const defaultPricing: ModelPricing = {
  provider: 'openrouter',
  model: 'unknown',
  tier: 'standard',
  inputUsdPerMillionTokens: 0,
  outputUsdPerMillionTokens: 0,
};

const defaultPricingCatalog: ModelPricing[] = [
  {
    provider: 'openrouter',
    model: 'openai/gpt-oss-120b:free',
    tier: 'free',
    inputUsdPerMillionTokens: 0,
    outputUsdPerMillionTokens: 0,
  },
  {
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',
    tier: 'cheap',
    inputUsdPerMillionTokens: 0.15,
    outputUsdPerMillionTokens: 0.6,
  },
];

export interface ModelPricingCatalogOptions {
  pricing?: ModelPricing[] | undefined;
}

export class ModelPricingCatalog {
  private readonly pricingCatalog: Map<string, ModelPricing>;

  public constructor(options: ModelPricingCatalogOptions = {}) {
    const pricing = options.pricing ?? defaultPricingCatalog;

    this.pricingCatalog = new Map(
      pricing.map((item) => {
        return [this.key(item.provider, item.model), item];
      }),
    );
  }

  public getPricing(provider: string, model: string): ModelPricing {
    return (
      this.pricingCatalog.get(this.key(provider, model)) ?? {
        ...defaultPricing,
        provider: 'openrouter',
        model,
      }
    );
  }

  public estimate(input: ModelCostEstimateInput): ModelCostEstimate {
    const pricing = this.getPricing(input.provider, input.model);
    const inputCost = (input.promptTokens / 1_000_000) * pricing.inputUsdPerMillionTokens;
    const outputCost = (input.completionTokens / 1_000_000) * pricing.outputUsdPerMillionTokens;

    return {
      provider: input.provider,
      model: input.model,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      estimatedUsd: Number((inputCost + outputCost).toFixed(8)),
      pricingKnown: pricing.model !== 'unknown',
    };
  }

  private key(provider: string, model: string): string {
    return `${provider}:${model}`;
  }
}
