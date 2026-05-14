import { ModelCapabilitiesRegistry } from './ModelCapabilities.js';

export interface ModelSelectorOptions {
  defaultModel?: string | undefined;
}

export class ModelSelector {
  private readonly defaultModel: string;
  private readonly capabilitiesRegistry = new ModelCapabilitiesRegistry();

  public constructor(options: ModelSelectorOptions = {}) {
    this.defaultModel = options.defaultModel ?? 'openai/gpt-4o-mini';
  }

  public selectModel(requestedModel?: string): string {
    return requestedModel ?? this.defaultModel;
  }

  public getCapabilities(model?: string) {
    return this.capabilitiesRegistry.getCapabilities(this.selectModel(model));
  }

  public getRecommendedMaxTokens(model?: string): number {
    return this.capabilitiesRegistry.getRecommendedMaxTokens(this.selectModel(model));
  }

  public shouldUseReasoningControl(model?: string): boolean {
    return this.capabilitiesRegistry.supportsReasoningControl(this.selectModel(model));
  }
}
