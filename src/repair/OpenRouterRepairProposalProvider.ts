import type { OpenRouterChatCompletionInput } from '../providers/OpenRouterTypes.js';
import type { OpenRouterClient } from '../providers/OpenRouterClient.js';
import { ProviderResponseNormalizer } from '../providers/ProviderResponseNormalizer.js';
import { PromptInjectionScanner } from '../security/PromptInjectionScanner.js';
import type { SecurityFinding } from '../security/SecurityReviewTypes.js';
import { RepairCostEstimator } from './RepairCostEstimator.js';
import { PatchProposalParser } from './PatchProposalParser.js';
import type {
  RepairProposalProvider,
  RepairProposalProviderResult,
} from './RepairProposalProvider.js';
import type { RepairModelUsage, RepairRequest } from '../types/RepairTypes.js';

export interface OpenRouterRepairClient {
  createChatCompletion(
    input: OpenRouterChatCompletionInput,
  ): ReturnType<OpenRouterClient['createChatCompletion']>;
}

export interface OpenRouterRepairProposalProviderOptions {
  client: OpenRouterRepairClient;
  model: string;
  parser?: PatchProposalParser | undefined;
  normalizer?: ProviderResponseNormalizer | undefined;
  promptInjectionScanner?: PromptInjectionScanner | undefined;
  costEstimator?: RepairCostEstimator | undefined;
  maxTokens?: number | undefined;
  temperature?: number | undefined;
  systemPrompt?: string | undefined;
  allowJsonExtraction?: boolean | undefined;
  blockProviderOutputThreats?: boolean | undefined;
}

export class OpenRouterRepairProposalProvider implements RepairProposalProvider {
  private readonly client: OpenRouterRepairClient;
  public readonly model: string;
  private readonly parser: PatchProposalParser;
  private readonly normalizer: ProviderResponseNormalizer;
  private readonly promptInjectionScanner: PromptInjectionScanner;
  private readonly costEstimator: RepairCostEstimator;
  private readonly maxTokens?: number | undefined;
  private readonly temperature?: number | undefined;
  private readonly systemPrompt: string;
  private readonly allowJsonExtraction: boolean;
  private readonly blockProviderOutputThreats: boolean;

  public constructor(options: OpenRouterRepairProposalProviderOptions) {
    this.client = options.client;
    this.model = options.model;
    this.parser = options.parser ?? new PatchProposalParser();
    this.normalizer = options.normalizer ?? new ProviderResponseNormalizer();
    this.promptInjectionScanner = options.promptInjectionScanner ?? new PromptInjectionScanner();
    this.costEstimator = options.costEstimator ?? new RepairCostEstimator();
    this.maxTokens = options.maxTokens;
    this.temperature = options.temperature;
    this.systemPrompt =
      options.systemPrompt ??
      [
        'You are a repair proposal generator inside Zero Runtime.',
        'Return only a JSON PatchProposal object.',
        'Do not apply changes.',
        'Do not include secrets.',
        'The runtime will validate, audit, and decide whether anything can be applied.',
      ].join(' ');
    this.allowJsonExtraction = options.allowJsonExtraction ?? true;
    this.blockProviderOutputThreats = options.blockProviderOutputThreats ?? true;
  }

  public async propose(input: {
    request: RepairRequest;
    prompt: string;
  }): Promise<RepairProposalProviderResult> {
    const clientResult = await this.client.createChatCompletion({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: this.systemPrompt,
        },
        {
          role: 'user',
          content: input.prompt,
        },
      ],
      maxTokens: this.maxTokens,
      temperature: this.temperature,
    });

    const normalized = this.normalizer.normalizeOpenRouterClientResult({
      result: clientResult,
      model: this.model,
      provider: 'openrouter',
    });

    if (!normalized.ok) {
      return Promise.reject(
        new Error(
          `OpenRouter repair proposal provider failed normalization: ${normalized.error.code}: ${normalized.error.message}`,
        ),
      );
    }

    const threatScan = this.promptInjectionScanner.scanProviderOutput({
      source: 'openrouter-repair-proposal-provider',
      content: normalized.value.text,
    });

    if (this.blockProviderOutputThreats && !threatScan.safe) {
      return Promise.reject(
        new Error(
          `OpenRouter repair proposal provider blocked unsafe provider output: ${this.formatThreatFindings(
            threatScan.findings,
          )}`,
        ),
      );
    }

    const parsed = this.parser.parse(normalized.value.text, {
      allowJsonExtraction: this.allowJsonExtraction,
    });

    if (!parsed.ok) {
      return Promise.reject(
        new Error(`OpenRouter repair proposal failed validation: ${parsed.error.message}`),
      );
    }

    return {
      proposal: parsed.value,
      modelUsage: this.buildModelUsage({
        prompt: input.prompt,
        completion: normalized.value.text,
        promptTokens: normalized.value.usage?.promptTokens,
        completionTokens: normalized.value.usage?.completionTokens,
        totalTokens: normalized.value.usage?.totalTokens,
      }),
    };
  }

  private buildModelUsage(input: {
    prompt: string;
    completion: string;
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    totalTokens?: number | undefined;
  }): RepairModelUsage {
    const estimate = this.costEstimator.estimate({
      provider: 'openrouter',
      model: this.model,
      prompt: input.prompt,
      expectedCompletionText: input.completion,
    });

    const promptTokens = input.promptTokens ?? estimate.promptTokens;
    const completionTokens = input.completionTokens ?? estimate.completionTokens;
    const totalTokens = input.totalTokens ?? promptTokens + completionTokens;

    return {
      provider: 'openrouter',
      model: this.model,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedUsd: estimate.estimatedUsd,
    };
  }

  private formatThreatFindings(findings: readonly SecurityFinding[]): string {
    const blockingFindings = findings.filter((finding) => {
      return finding.severity === 'error' || finding.severity === 'critical';
    });

    if (blockingFindings.length === 0) {
      return 'no blocking findings';
    }

    return blockingFindings
      .slice(0, 5)
      .map((finding) => `${finding.code}: ${finding.message}`)
      .join('; ');
  }
}
