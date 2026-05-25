import type { RuntimePatchProposal } from './PatchProposal.js';
import { PatchProposalFilter, type PatchProposalFilterResult } from './PatchProposalFilter.js';

export interface ApprovedPatchBuilderInput {
  proposal: RuntimePatchProposal;
  selectedFilePaths: string[];
}

export class ApprovedPatchBuilder {
  private readonly filter: PatchProposalFilter;

  public constructor(filter = new PatchProposalFilter()) {
    this.filter = filter;
  }

  public build(input: ApprovedPatchBuilderInput): PatchProposalFilterResult {
    return this.filter.filter({
      proposal: input.proposal,
      selectedFilePaths: input.selectedFilePaths,
    });
  }
}
