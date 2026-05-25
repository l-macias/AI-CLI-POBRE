import type { PatchProposalRiskLevel } from './PatchProposal.js';

export type PatchSizeClass = 'single_file' | 'small_multi_file' | 'large_multi_file';

export interface PatchSizeClassification {
  className: PatchSizeClass;
  riskLevel: PatchProposalRiskLevel;
  requiresSelectiveApproval: boolean;
  requiresSnapshot: boolean;
  requiresVerify: boolean;
  requiresBatching: boolean;
}

export class PatchSizeClassifier {
  public classify(totalFiles: number): PatchSizeClassification {
    if (totalFiles <= 1) {
      return {
        className: 'single_file',
        riskLevel: 'low',
        requiresSelectiveApproval: false,
        requiresSnapshot: false,
        requiresVerify: false,
        requiresBatching: false,
      };
    }

    if (totalFiles <= 5) {
      return {
        className: 'small_multi_file',
        riskLevel: 'medium',
        requiresSelectiveApproval: true,
        requiresSnapshot: true,
        requiresVerify: true,
        requiresBatching: false,
      };
    }

    return {
      className: 'large_multi_file',
      riskLevel: 'high',
      requiresSelectiveApproval: true,
      requiresSnapshot: true,
      requiresVerify: true,
      requiresBatching: true,
    };
  }
}
