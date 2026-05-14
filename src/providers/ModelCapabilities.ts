export interface ModelCapabilities {
  supportsJsonMode: boolean;
  supportsReasoningControl: boolean;
  requiresReasoning: boolean;
  recommendedMaxTokens: number;
}

const defaultCapabilities: ModelCapabilities = {
  supportsJsonMode: true,
  supportsReasoningControl: false,
  requiresReasoning: false,
  recommendedMaxTokens: 512,
};

const modelCapabilities = new Map<string, ModelCapabilities>([
  [
    'openai/gpt-oss-120b:free',
    {
      supportsJsonMode: true,
      supportsReasoningControl: false,
      requiresReasoning: true,
      recommendedMaxTokens: 256,
    },
  ],
  [
    'openai/gpt-4o-mini',
    {
      supportsJsonMode: true,
      supportsReasoningControl: false,
      requiresReasoning: false,
      recommendedMaxTokens: 512,
    },
  ],
]);

export class ModelCapabilitiesRegistry {
  public getCapabilities(model: string): ModelCapabilities {
    return modelCapabilities.get(model) ?? defaultCapabilities;
  }

  public supportsReasoningControl(model: string): boolean {
    return this.getCapabilities(model).supportsReasoningControl;
  }

  public supportsJsonMode(model: string): boolean {
    return this.getCapabilities(model).supportsJsonMode;
  }

  public getRecommendedMaxTokens(model: string): number {
    return this.getCapabilities(model).recommendedMaxTokens;
  }
}
