import type { PatchFileChange, PatchProposalOperation } from './PatchProposal.js';
import { PatchSelectionPolicy } from './PatchSelectionPolicy.js';

export interface PatchFileReviewBuildInput {
  path: string;
  operation: PatchProposalOperation;
  beforeHash: string | null;
  content: string | null;
  reason: string;
  changesSummary: string[];
}

export class PatchFileReviewBuilder {
  private readonly selectionPolicy: PatchSelectionPolicy;

  public constructor(selectionPolicy = new PatchSelectionPolicy()) {
    this.selectionPolicy = selectionPolicy;
  }

  public build(input: PatchFileReviewBuildInput, totalFiles: number): PatchFileChange {
    return {
      path: input.path,
      operation: input.operation,
      beforeHash: input.beforeHash,
      content: input.content,
      reason: input.reason.trim(),
      changesSummary: this.normalizeSummary(input.changesSummary),
      riskLevel: this.selectionPolicy.riskForFile({
        path: input.path,
        operation: input.operation,
        totalFiles,
      }),
      userSelectable: this.selectionPolicy.userSelectableForFile(),
    };
  }

  private normalizeSummary(summary: string[]): string[] {
    const normalized = summary
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 8);

    if (normalized.length === 0) {
      return ['Runtime detected a file-level patch change that requires review.'];
    }

    return normalized;
  }
}
