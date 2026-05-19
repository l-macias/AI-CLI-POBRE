import { ModelBudgetController } from './ModelBudgetController.js';
import { ModelPricingCatalog } from './ModelPricingCatalog.js';
import { ProviderRuntimePolicy } from './ProviderRuntimePolicy.js';
import { ProviderStrategy } from './ProviderStrategy.js';
import { ProviderUsageLedger } from './ProviderUsageLedger.js';
import type {
  ProviderRuntimeConfig,
  ProviderRuntimeConfigLoadResult,
} from '../types/ProviderRuntimeConfigTypes.js';

export interface ProviderRuntimeFactoryResult {
  runtimePolicy: ProviderRuntimePolicy;
  loadResult: ProviderRuntimeConfigLoadResult;
}

export class ProviderRuntimeFactory {
  public createFromConfigLoadResult(
    loadResult: ProviderRuntimeConfigLoadResult,
  ): ProviderRuntimeFactoryResult {
    return {
      runtimePolicy: this.create(loadResult.config),
      loadResult,
    };
  }

  public create(config: ProviderRuntimeConfig): ProviderRuntimePolicy {
    const pricingCatalog = new ModelPricingCatalog({
      pricing: config.modelBudget.pricing,
    });

    return new ProviderRuntimePolicy({
      strategy: new ProviderStrategy({
        config: config.providerStrategy,
      }),
      budgetController: new ModelBudgetController({
        tokenLimit: config.modelBudget.tokenLimit,
        costLimit: config.modelBudget.costLimit,
        pricingCatalog,
      }),
      usageLedger: new ProviderUsageLedger({
        pricingCatalog,
      }),
    });
  }
}
