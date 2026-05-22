import { createHash } from 'node:crypto';
import type {
  PatchFileChange,
  PatchProposalGenerationInput,
  PatchProposalGenerationResult,
  RuntimePatchProposal,
} from './PatchProposal.js';
import { PatchProposalValidator } from './PatchProposalValidator.js';
import { PatchRiskAnalyzer } from './PatchRiskAnalyzer.js';

export interface PatchProposalGeneratorOptions {
  validator?: PatchProposalValidator | undefined;
  riskAnalyzer?: PatchRiskAnalyzer | undefined;
}

export class PatchProposalGenerator {
  private readonly validator: PatchProposalValidator;
  private readonly riskAnalyzer: PatchRiskAnalyzer;

  public constructor(options: PatchProposalGeneratorOptions = {}) {
    this.validator = options.validator ?? new PatchProposalValidator();
    this.riskAnalyzer = options.riskAnalyzer ?? new PatchRiskAnalyzer();
  }

  public generate(input: PatchProposalGenerationInput): PatchProposalGenerationResult {
    const files = this.buildFileChanges(input);
    const analyzedRisks = this.riskAnalyzer.analyze(files);
    const riskLevel = this.riskAnalyzer.highestRisk(analyzedRisks);

    const proposal: RuntimePatchProposal = {
      id: this.createProposalId(),
      planId: input.planId,
      sessionId: input.sessionId,
      projectRoot: input.projectRoot,
      summary: input.summary.trim(),
      files,
      risks: analyzedRisks,
      verifyCommands: input.verifyCommands,
      riskLevel: this.maxRisk(input.riskLevel, riskLevel),
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

  private buildFileChanges(input: PatchProposalGenerationInput): PatchFileChange[] {
    return input.candidateFiles.map((candidate): PatchFileChange => {
      const normalizedContent = candidate.content ?? '';

      if (candidate.existsKnown) {
        return {
          path: candidate.path,
          operation: 'modify',
          beforeHash: this.hashContent(normalizedContent),
          content: this.buildProposedContent(normalizedContent, candidate.path),
          reason: candidate.reason,
        };
      }

      return {
        path: candidate.path,
        operation: 'create',
        beforeHash: null,
        content: this.buildCreatedContent(candidate.path),
        reason: candidate.reason,
      };
    });
  }

  private buildProposedContent(currentContent: string, path: string): string {
    const marker = `\n// Runtime patch proposal placeholder for ${path}\n`;

    if (currentContent.includes(marker.trim())) {
      return currentContent;
    }

    return `${currentContent.replace(/\s*$/, '')}${marker}`;
  }

  private buildCreatedContent(path: string): string {
    return [
      `// Runtime patch proposal placeholder for ${path}`,
      '// Session 85 only proposes content; it does not apply files.',
      '',
    ].join('\n');
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private maxRisk(
    first: RuntimePatchProposal['riskLevel'],
    second: RuntimePatchProposal['riskLevel'],
  ): RuntimePatchProposal['riskLevel'] {
    if (first === 'high' || second === 'high') {
      return 'high';
    }

    if (first === 'medium' || second === 'medium') {
      return 'medium';
    }

    return 'low';
  }

  private createProposalId(): string {
    return `patch-proposal-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}`;
  }
}
