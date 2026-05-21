import type {
  ProviderSelectionInput,
  ProviderSelectionResult,
  ProviderStrategyConfig,
} from '../types/ProviderStrategyTypes.js';
import { ProviderPolicy } from './ProviderPolicy.js';
import { ProviderSelectionAuditor } from './ProviderSelectionAuditor.js';
import { RiskBasedModelSelector } from './RiskBasedModelSelector.js';

export interface ProviderStrategyOptions {
  defaultModel?: string | undefined;
  config?: ProviderStrategyConfig | undefined;
  policy?: ProviderPolicy | undefined;
  selector?: RiskBasedModelSelector | undefined;
  auditor?: ProviderSelectionAuditor | undefined;
}

export class ProviderStrategy {
  private readonly policy: ProviderPolicy;
  private readonly selector: RiskBasedModelSelector;
  private readonly auditor: ProviderSelectionAuditor;
  private readonly config: ProviderStrategyConfig;

  public constructor(options: ProviderStrategyOptions = {}) {
    this.policy = options.policy ?? new ProviderPolicy();
    this.selector = options.selector ?? new RiskBasedModelSelector();
    this.auditor = options.auditor ?? new ProviderSelectionAuditor();
    this.config =
      options.config ??
      this.policy.createDefaultConfig(options.defaultModel ?? 'openai/gpt-4o-mini');
  }

  public select(input: ProviderSelectionInput): ProviderSelectionResult {
    const roleConfig = this.policy.getRoleConfig(this.config, input.role);
    const requestedProfileConfig = input.requestedProfile
      ? this.policy.getProfileConfig(this.config, input.requestedProfile)
      : null;
    const preferredProfileConfig = roleConfig.preferredProfile
      ? this.policy.getProfileConfig(this.config, roleConfig.preferredProfile)
      : null;

    const selected = this.selector.select({
      roleConfig,
      request: input,
      requestedProfileConfig: requestedProfileConfig ?? undefined,
      preferredProfileConfig: preferredProfileConfig ?? undefined,
    });

    const result: ProviderSelectionResult = {
      role: input.role,
      provider:
        requestedProfileConfig?.provider ?? preferredProfileConfig?.provider ?? roleConfig.provider,
      model: selected.model,
      tier: selected.tier,
      fallbackModels: requestedProfileConfig?.fallbackModels
        ? [...requestedProfileConfig.fallbackModels]
        : [...roleConfig.fallbackModels],
      reason: selected.reason,
      routingReasons: input.routingReasons ? [...input.routingReasons] : [],
      premiumSelected: selected.premiumSelected,
      riskLevel: input.riskLevel,
      selectedAt: new Date().toISOString(),
    };

    if (selected.profile) {
      result.profile = selected.profile;
    }

    this.auditor.record(result);

    return result;
  }

  public getAuditLog() {
    return this.auditor.list();
  }

  public getConfig(): ProviderStrategyConfig {
    return {
      defaultProvider: this.config.defaultProvider,
      profiles: this.config.profiles?.map((profile) => ({
        ...profile,
        fallbackModels: [...profile.fallbackModels],
      })),
      roles: this.config.roles.map((role) => ({
        ...role,
        fallbackModels: [...role.fallbackModels],
      })),
    };
  }
}
