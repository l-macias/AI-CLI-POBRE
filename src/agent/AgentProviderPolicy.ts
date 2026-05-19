import type { AgentLoopIssue } from './AgentTypes.js';
import type { AgentProviderConfig } from './AgentProviderConfig.js';

export type AgentProviderPolicyStatus = 'allowed' | 'blocked';

export interface AgentProviderPolicyDecision {
  status: AgentProviderPolicyStatus;
  allowed: boolean;
  provider: AgentProviderConfig['provider'];
  providerModel?: string | undefined;
  allowRealProvider: boolean;
  allowPremium: boolean;
  premiumApproved: boolean;
  includeProjectMemory: boolean;
  estimatedCompletionTokens: number;
  fallbackProvider: 'fake-llm';
  fallbackReason?: string | undefined;
  issues: AgentLoopIssue[];
}

export interface AgentProviderPolicyOptions {
  defaultEstimatedCompletionTokens?: number | undefined;
  maxEstimatedCompletionTokens?: number | undefined;
  knownPremiumModelFragments?: string[] | undefined;
}

export class AgentProviderPolicy {
  private readonly defaultEstimatedCompletionTokens: number;
  private readonly maxEstimatedCompletionTokens: number;
  private readonly knownPremiumModelFragments: readonly string[];

  public constructor(options: AgentProviderPolicyOptions = {}) {
    this.defaultEstimatedCompletionTokens = options.defaultEstimatedCompletionTokens ?? 1200;
    this.maxEstimatedCompletionTokens = options.maxEstimatedCompletionTokens ?? 8000;
    this.knownPremiumModelFragments = (
      options.knownPremiumModelFragments ?? [
        'gpt-4',
        'gpt-5',
        'claude',
        'opus',
        'sonnet',
        'gemini-pro',
        'deepseek-chat',
        'mistral-large',
      ]
    ).map((fragment) => fragment.toLowerCase());
  }

  public evaluate(config: AgentProviderConfig): AgentProviderPolicyDecision {
    const issues: AgentLoopIssue[] = [];
    const estimatedCompletionTokens = this.resolveEstimatedCompletionTokens(
      config.estimatedCompletionTokens,
    );
    const providerModel = this.normalizeOptionalString(config.providerModel);
    const isRealProvider = config.provider === 'openrouter';
    const requiresPremiumApproval =
      isRealProvider && providerModel !== undefined && this.isPremiumLikeModel(providerModel);

    if (config.provider === 'openrouter' && config.allowRealProvider !== true) {
      issues.push({
        code: 'AGENT_PROVIDER_REAL_PROVIDER_OPT_IN_REQUIRED',
        message:
          'Agent provider policy blocked OpenRouter because allowRealProvider is not enabled.',
        severity: 'error',
      });
    }

    if (config.provider === 'openrouter' && !providerModel) {
      issues.push({
        code: 'AGENT_PROVIDER_MODEL_REQUIRED',
        message: 'Agent provider policy requires providerModel when provider is openrouter.',
        severity: 'error',
      });
    }

    if (requiresPremiumApproval && config.allowPremium !== true) {
      issues.push({
        code: 'AGENT_PROVIDER_PREMIUM_NOT_ALLOWED',
        message:
          'Agent provider policy blocked premium-like model because allowPremium is not enabled.',
        severity: 'error',
      });
    }

    if (requiresPremiumApproval && config.premiumApproved !== true) {
      issues.push({
        code: 'AGENT_PROVIDER_PREMIUM_APPROVAL_REQUIRED',
        message:
          'Agent provider policy blocked premium-like model because premiumApproved is not enabled.',
        severity: 'error',
      });
    }

    if (
      typeof config.estimatedCompletionTokens === 'number' &&
      Number.isFinite(config.estimatedCompletionTokens) &&
      config.estimatedCompletionTokens > this.maxEstimatedCompletionTokens
    ) {
      issues.push({
        code: 'AGENT_PROVIDER_TOKEN_BUDGET_EXCEEDED',
        message: `Agent provider policy blocked estimated completion tokens above ${String(
          this.maxEstimatedCompletionTokens,
        )}.`,
        severity: 'error',
      });
    }

    if (
      config.includeProjectMemory &&
      config.provider === 'openrouter' &&
      !config.allowRealProvider
    ) {
      issues.push({
        code: 'AGENT_PROVIDER_MEMORY_DOES_NOT_AUTHORIZE_REAL_PROVIDER',
        message:
          'Project memory inclusion does not authorize real provider usage. Explicit allowRealProvider is still required.',
        severity: 'error',
      });
    }

    const allowed = issues.every((issue) => issue.severity !== 'error');

    return {
      status: allowed ? 'allowed' : 'blocked',
      allowed,
      provider: config.provider,
      providerModel,
      allowRealProvider: config.allowRealProvider,
      allowPremium: config.allowPremium,
      premiumApproved: config.premiumApproved,
      includeProjectMemory: config.includeProjectMemory,
      estimatedCompletionTokens,
      fallbackProvider: 'fake-llm',
      fallbackReason: allowed ? undefined : 'Agent provider policy blocked requested provider.',
      issues,
    };
  }

  private resolveEstimatedCompletionTokens(value: number | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return this.defaultEstimatedCompletionTokens;
    }

    return Math.floor(value);
  }

  private normalizeOptionalString(value: string | undefined): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  private isPremiumLikeModel(model: string): boolean {
    const normalized = model.toLowerCase();

    return this.knownPremiumModelFragments.some((fragment) => normalized.includes(fragment));
  }
}
