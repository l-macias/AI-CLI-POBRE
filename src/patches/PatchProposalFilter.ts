import { createHash } from 'node:crypto';
import type { PatchFileChange, PatchProposalRisk, RuntimePatchProposal } from './PatchProposal.js';
import { PatchProposalValidator } from './PatchProposalValidator.js';
import { PatchRiskAnalyzer } from './PatchRiskAnalyzer.js';

export interface PatchProposalFilterInput {
  proposal: RuntimePatchProposal;
  selectedFilePaths: string[];
}

export interface PatchProposalFilterResult {
  proposal: RuntimePatchProposal;
  originalProposalId: string;
  selectedFilePaths: string[];
  rejectedFilePaths: string[];
}

export class PatchProposalFilter {
  private readonly validator: PatchProposalValidator;
  private readonly riskAnalyzer: PatchRiskAnalyzer;

  public constructor(
    validator = new PatchProposalValidator(),
    riskAnalyzer = new PatchRiskAnalyzer(),
  ) {
    this.validator = validator;
    this.riskAnalyzer = riskAnalyzer;
  }

  public filter(input: PatchProposalFilterInput): PatchProposalFilterResult {
    if (input.proposal.status !== 'validated') {
      throw new Error('Selective patch apply requires a validated patch proposal.');
    }

    const normalizedSelected = this.normalizeSelectedFilePaths(input.selectedFilePaths);

    if (normalizedSelected.length === 0) {
      throw new Error('Selective patch apply requires at least one selected file.');
    }

    const selectedSet = new Set(normalizedSelected);

    const unknownSelected = normalizedSelected.filter(
      (selectedPath) =>
        !input.proposal.files.some((file) => this.normalizePath(file.path) === selectedPath),
    );

    if (unknownSelected.length > 0) {
      throw new Error(`Selected files are not part of the proposal: ${unknownSelected.join(', ')}`);
    }

    const selectedFiles = input.proposal.files.filter((file) =>
      selectedSet.has(this.normalizePath(file.path)),
    );

    if (selectedFiles.length === 0) {
      throw new Error('Selected files do not match any patch proposal files.');
    }

    const rejectedFilePaths = input.proposal.files
      .filter((file) => !selectedSet.has(this.normalizePath(file.path)))
      .map((file) => file.path);

    const risks = this.riskAnalyzer.analyze(selectedFiles);
    const riskLevel = this.riskAnalyzer.highestRisk(risks);

    const filteredProposal: RuntimePatchProposal = {
      ...input.proposal,
      id: this.createFilteredProposalId(input.proposal.id, selectedFiles),
      summary: this.createFilteredSummary(input.proposal.summary, selectedFiles, rejectedFilePaths),
      files: selectedFiles,
      risks: this.withTraceabilityRisk(risks, input.proposal.id, rejectedFilePaths),
      riskLevel,
      status: 'generated',
      createdAt: input.proposal.createdAt,
    };

    const validation = this.validator.validate(filteredProposal);

    if (!validation.valid) {
      throw new Error(
        `Filtered patch proposal is invalid: ${validation.issues
          .map((issue) => issue.code)
          .join(', ')}`,
      );
    }

    return {
      proposal: {
        ...filteredProposal,
        status: 'validated',
      },
      originalProposalId: input.proposal.id,
      selectedFilePaths: selectedFiles.map((file) => file.path),
      rejectedFilePaths,
    };
  }

  private normalizeSelectedFilePaths(paths: string[]): string[] {
    return [
      ...new Set(paths.map((path) => this.normalizePath(path)).filter((path) => path.length > 0)),
    ];
  }

  private normalizePath(filePath: string): string {
    return filePath
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '');
  }

  private createFilteredProposalId(
    originalProposalId: string,
    selectedFiles: PatchFileChange[],
  ): string {
    const fingerprint = createHash('sha256')
      .update(
        selectedFiles
          .map((file) => this.normalizePath(file.path))
          .sort()
          .join('|'),
      )
      .digest('hex')
      .slice(0, 12);

    return `${originalProposalId}-selected-${fingerprint}`;
  }

  private createFilteredSummary(
    originalSummary: string,
    selectedFiles: PatchFileChange[],
    rejectedFilePaths: string[],
  ): string {
    return [
      originalSummary,
      '',
      `Selective apply proposal: ${selectedFiles.length} selected file(s), ${rejectedFilePaths.length} rejected file(s).`,
    ].join('\n');
  }

  private withTraceabilityRisk(
    risks: PatchProposalRisk[],
    originalProposalId: string,
    rejectedFilePaths: string[],
  ): PatchProposalRisk[] {
    return [
      ...risks,
      {
        code: 'SELECTIVE_PATCH_PROPOSAL',
        level: rejectedFilePaths.length > 0 ? 'medium' : 'low',
        message: `Patch proposal was filtered from original proposal ${originalProposalId}.`,
        mitigation:
          rejectedFilePaths.length > 0
            ? `Runtime will apply only selected files. Rejected files: ${rejectedFilePaths.join(', ')}.`
            : 'Runtime will apply all files from the original proposal.',
      },
    ];
  }
}
