import type {
  RepairProposalProvider,
  RepairProposalProviderResult,
} from './RepairProposalProvider.js';
import { PatchProposalParser } from './PatchProposalParser.js';
import type { PatchProposal, RepairModelUsage, RepairRequest } from '../types/RepairTypes.js';

export type FakeLlmRepairProposalMode =
  | 'json_only'
  | 'markdown_json'
  | 'text_around_json'
  | 'invalid_json'
  | 'invalid_schema';

export interface FakeLlmRepairProposalProviderInput {
  request: RepairRequest;
  prompt: string;
}

export interface FakeLlmRepairProposalProviderOptions {
  mode?: FakeLlmRepairProposalMode | undefined;
  parser?: PatchProposalParser | undefined;
  proposalFactory?: ((input: FakeLlmRepairProposalProviderInput) => PatchProposal) | undefined;
  rawResponseFactory?: ((input: FakeLlmRepairProposalProviderInput) => string) | undefined;
  allowJsonExtraction?: boolean | undefined;
}

export class FakeLlmRepairProposalProvider implements RepairProposalProvider {
  private readonly mode: FakeLlmRepairProposalMode;
  private readonly parser: PatchProposalParser;
  private readonly proposalFactory?:
    | ((input: FakeLlmRepairProposalProviderInput) => PatchProposal)
    | undefined;
  private readonly rawResponseFactory?:
    | ((input: FakeLlmRepairProposalProviderInput) => string)
    | undefined;
  private readonly allowJsonExtraction: boolean;

  public constructor(options: FakeLlmRepairProposalProviderOptions = {}) {
    this.mode = options.mode ?? 'json_only';
    this.parser = options.parser ?? new PatchProposalParser();
    this.proposalFactory = options.proposalFactory;
    this.rawResponseFactory = options.rawResponseFactory;
    this.allowJsonExtraction = options.allowJsonExtraction ?? this.mode !== 'json_only';
  }

  public propose(input: FakeLlmRepairProposalProviderInput): Promise<RepairProposalProviderResult> {
    const rawResponse = this.rawResponseFactory?.(input) ?? this.buildRawResponse(input);
    const parsed = this.parser.parse(rawResponse, {
      allowJsonExtraction: this.allowJsonExtraction,
    });

    if (!parsed.ok) {
      return Promise.reject(
        new Error(`Fake LLM repair proposal failed validation: ${parsed.error.message}`),
      );
    }

    return Promise.resolve({
      proposal: parsed.value,
      modelUsage: this.estimateUsage(input.prompt, rawResponse),
    });
  }

  private buildRawResponse(input: FakeLlmRepairProposalProviderInput): string {
    if (this.mode === 'invalid_json') {
      return '{ invalid json';
    }

    if (this.mode === 'invalid_schema') {
      return JSON.stringify(
        {
          id: 'fake-invalid-schema-proposal',
          summary: 'Invalid fake proposal.',
          riskLevel: 'critical',
          operations: [],
          explanation: 'This intentionally violates the PatchProposal schema.',
        },
        null,
        2,
      );
    }

    const proposal = this.proposalFactory?.(input) ?? this.buildDefaultProposal(input);
    const json = JSON.stringify(proposal, null, 2);

    if (this.mode === 'markdown_json') {
      return `\`\`\`json
${json}
\`\`\``;
    }

    if (this.mode === 'text_around_json') {
      return `Here is the proposed repair. The runtime must validate it before trusting it.

${json}

End of fake LLM response.`;
    }

    return json;
  }

  private buildDefaultProposal(input: FakeLlmRepairProposalProviderInput): PatchProposal {
    const firstTarget = input.request.targetFiles[0];

    if (!firstTarget) {
      return {
        id: 'fake-llm-empty-proposal',
        summary: 'No target files available for fake repair.',
        riskLevel: 'low',
        operations: [],
        explanation:
          'The fake provider could not create an operation because no target file exists.',
      };
    }

    return {
      id: 'fake-llm-repair-proposal',
      summary: `Fake repair proposal for ${firstTarget.relativePath}.`,
      riskLevel: 'low',
      operations: [
        {
          kind: firstTarget.exists ? 'replace_file' : 'create_file',
          targetFile: firstTarget.relativePath,
          expectedCurrentContent: firstTarget.exists ? firstTarget.content : undefined,
          newContent: firstTarget.content,
          reason:
            'Fake provider echoes the current content to exercise parser, schema, safety validation, and diff generation.',
        },
      ],
      explanation:
        'This fake proposal is intentionally deterministic and does not call a real paid provider.',
    };
  }

  private estimateUsage(prompt: string, completion: string): RepairModelUsage {
    const promptTokens = this.estimateTokens(prompt);
    const completionTokens = this.estimateTokens(completion);

    return {
      provider: 'fake-llm',
      model: 'fake-repair-proposal-provider',
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedUsd: 0,
    };
  }

  private estimateTokens(value: string): number {
    return Math.ceil(value.length / 4);
  }
}
