import { createHash } from 'node:crypto';
import type { ProviderManager } from '../providers/ProviderManager.js';
import type { ProviderName, ProviderUsage } from '../types/ProviderTypes.js';
import type {
  PatchFileChange,
  PatchProposalGenerationResult,
  PatchProposalRiskLevel,
  PatchProposalVerifyCommand,
  RuntimePatchProposal,
} from './PatchProposal.js';
import { PatchProposalValidator } from './PatchProposalValidator.js';
import { PatchRiskAnalyzer } from './PatchRiskAnalyzer.js';
import type { ResolvedPatchCandidate } from './PatchCandidateResolver.js';
import {
  runtimePatchProviderSchema,
  type RuntimePatchProviderOutput,
} from './RuntimePatchProviderSchema.js';

export interface RuntimePatchProviderBridgeOptions {
  providerManager: ProviderManager;
  providerName?: ProviderName | undefined;
  model: string;
  validator?: PatchProposalValidator | undefined;
  riskAnalyzer?: PatchRiskAnalyzer | undefined;
}

export interface RuntimePatchProviderBridgeInput {
  planId: string;
  sessionId: string;
  projectRoot: string;
  objective: string;
  riskLevel: PatchProposalRiskLevel;
  candidates: ResolvedPatchCandidate[];
  verifyCommands: PatchProposalVerifyCommand[];
  constraints: string[];
}

export interface RuntimePatchProviderAudit {
  provider: ProviderName;
  model: string;
  usage?: ProviderUsage | undefined;
  generatedAt: string;
}

export interface RuntimePatchProviderBridgeResult {
  result: PatchProposalGenerationResult;
  audit: RuntimePatchProviderAudit;
}

export class RuntimePatchProviderBridge {
  private readonly providerManager: ProviderManager;
  private readonly providerName: ProviderName;
  private readonly model: string;
  private readonly validator: PatchProposalValidator;
  private readonly riskAnalyzer: PatchRiskAnalyzer;

  public constructor(options: RuntimePatchProviderBridgeOptions) {
    this.providerManager = options.providerManager;
    this.providerName = options.providerName ?? 'openrouter';
    this.model = options.model;
    this.validator = options.validator ?? new PatchProposalValidator();
    this.riskAnalyzer = options.riskAnalyzer ?? new PatchRiskAnalyzer();
  }

  public async generate(
    input: RuntimePatchProviderBridgeInput,
  ): Promise<RuntimePatchProviderBridgeResult> {
    if (input.candidates.length === 0) {
      throw new Error('Provider patch generation requires at least one resolved real file.');
    }

    const response = await this.providerManager.completeJson(
      this.providerName,
      {
        model: this.model,
        temperature: 0,
        maxTokens: 6000,
        responseFormat: 'json',
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(),
          },
          {
            role: 'user',
            content: this.buildUserPrompt(input),
          },
        ],
      },
      runtimePatchProviderSchema,
    );

    const result = this.toPatchProposalResult({
      input,
      output: response.parsed,
    });

    return {
      result,
      audit: {
        provider: this.providerName,
        model: response.model,
        ...(response.usage ? { usage: response.usage } : {}),
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private toPatchProposalResult(input: {
    input: RuntimePatchProviderBridgeInput;
    output: RuntimePatchProviderOutput;
  }): PatchProposalGenerationResult {
    const files = this.toPatchFiles(input);
    const risks = this.riskAnalyzer.analyze(files);
    const riskLevel = this.maxRisk(input.input.riskLevel, this.riskAnalyzer.highestRisk(risks));

    const proposal: RuntimePatchProposal = {
      id: this.createProposalId(),
      planId: input.input.planId,
      sessionId: input.input.sessionId,
      projectRoot: input.input.projectRoot,
      summary: input.output.summary.trim(),
      files,
      risks,
      verifyCommands: input.input.verifyCommands,
      riskLevel,
      requiresApproval: true,
      status: 'generated',
      createdAt: new Date().toISOString(),
    };

    const validation = this.validator.validate(proposal);

    return {
      proposal: {
        ...proposal,
        status: validation.valid ? 'validated' : 'rejected',
      },
      validation,
    };
  }

  private toPatchFiles(input: {
    input: RuntimePatchProviderBridgeInput;
    output: RuntimePatchProviderOutput;
  }): PatchFileChange[] {
    const candidateByPath = new Map(
      input.input.candidates.map((candidate) => [this.normalizePath(candidate.path), candidate]),
    );

    return input.output.files.map((file): PatchFileChange => {
      const normalizedPath = this.normalizePath(file.path);
      const candidate = candidateByPath.get(normalizedPath);

      if (!candidate) {
        throw new Error(
          `Provider patch attempted to modify a file outside resolved candidates: ${file.path}`,
        );
      }

      if (file.operation !== 'modify') {
        throw new Error('Provider patch create operations are disabled for this runtime stage.');
      }

      return {
        path: candidate.path,
        operation: 'modify',
        beforeHash: this.hashContent(candidate.content),
        content: file.content,
        reason: file.reason,
      };
    });
  }

  private buildSystemPrompt(): string {
    return [
      'You generate structured patch proposals for Zero Runtime.',
      'Return exactly one valid JSON object.',
      'No markdown. No prose. No comments. No extra keys.',
      'The LLM proposes only; the runtime validates, diffs, gates, audits and decides.',
      'You must only modify files provided in the candidate file list.',
      'Do not create new files.',
      'Do not delete files.',
      'Do not rename files.',
      'Do not modify backend, database, .env, secrets, build outputs or dependency files.',
      'Return full replacement content for each modified file.',
      'Keep the patch small, safe and focused.',
      'Prefer modifying one file unless multiple files are clearly necessary.',
      'Do not include secrets or credentials.',
    ].join('\n');
  }

  private buildUserPrompt(input: RuntimePatchProviderBridgeInput): string {
    return [
      `Plan ID: ${input.planId}`,
      `Session ID: ${input.sessionId}`,
      `Objective: ${input.objective}`,
      `Risk level: ${input.riskLevel}`,
      `Constraints: ${input.constraints.join(' | ')}`,
      '',
      'Candidate files. You may only modify these exact paths:',
      ...input.candidates.map((candidate, index) =>
        [
          `--- FILE ${String(index + 1)}: ${candidate.path}`,
          `Reason: ${candidate.reason}`,
          'Content:',
          candidate.content,
          `--- END FILE ${String(index + 1)}`,
        ].join('\n'),
      ),
      '',
      'Return JSON with this exact shape:',
      JSON.stringify(
        {
          summary: 'Short summary of the safe UI/code improvement.',
          files: [
            {
              path: input.candidates[0]?.path ?? 'src/example.tsx',
              operation: 'modify',
              content: 'Full replacement file content here.',
              reason: 'Explain why this file is being modified.',
            },
          ],
        },
        null,
        2,
      ),
    ].join('\n');
  }

  private normalizePath(filePath: string): string {
    return filePath
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '');
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private maxRisk(
    first: PatchProposalRiskLevel,
    second: PatchProposalRiskLevel,
  ): PatchProposalRiskLevel {
    if (first === 'high' || second === 'high') {
      return 'high';
    }

    if (first === 'medium' || second === 'medium') {
      return 'medium';
    }

    return 'low';
  }

  private createProposalId(): string {
    return `provider-patch-proposal-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}`;
  }
}
