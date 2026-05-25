import type { PatchDiffPreview } from '../diff/PatchDiffTypes.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';
import type { ApprovalDecisionResult } from './ApprovalRequest.js';

export interface PatchApplyAuthorizationInput {
  proposal: RuntimePatchProposal;
  diff: PatchDiffPreview;
  decision: ApprovalDecisionResult | null;
}

export interface PatchApplyAuthorizationIssue {
  code: string;
  message: string;
}

export interface PatchApplyAuthorizationResult {
  authorized: boolean;
  issues: PatchApplyAuthorizationIssue[];
  selectedFilePaths: string[];
}

export class PatchApplyAuthorization {
  public authorize(input: PatchApplyAuthorizationInput): PatchApplyAuthorizationResult {
    const issues: PatchApplyAuthorizationIssue[] = [];

    if (!input.decision) {
      return {
        authorized: false,
        issues: [
          {
            code: 'APPROVAL_DECISION_REQUIRED',
            message: 'Patch apply requires an accepted approval decision.',
          },
        ],
        selectedFilePaths: [],
      };
    }

    if (!input.decision.accepted) {
      issues.push({
        code: 'APPROVAL_DECISION_NOT_ACCEPTED',
        message: 'Patch apply requires an accepted approval decision.',
      });
    }

    if (input.decision.action !== 'approve' && input.decision.action !== 'approve_selected_files') {
      issues.push({
        code: 'APPROVAL_ACTION_NOT_APPLY_AUTHORIZATION',
        message: `Approval action ${input.decision.action} does not authorize patch apply.`,
      });
    }

    const proposalFilePaths = input.proposal.files.map((file) => this.normalizePath(file.path));
    const diffFilePaths = input.diff.files.map((file) => this.normalizePath(file.path));
    const decisionFilePaths = input.decision.selectedFilePaths.map((filePath) =>
      this.normalizePath(filePath),
    );

    if (decisionFilePaths.length === 0) {
      issues.push({
        code: 'APPROVAL_SELECTED_FILES_REQUIRED',
        message: 'Patch apply approval must include selected file paths.',
      });
    }

    if (this.hasDuplicates(decisionFilePaths)) {
      issues.push({
        code: 'APPROVAL_SELECTED_FILES_DUPLICATED',
        message: 'Patch apply approval contains duplicated selected file paths.',
      });
    }

    const proposalSet = new Set(proposalFilePaths);
    const diffSet = new Set(diffFilePaths);
    const decisionSet = new Set(decisionFilePaths);

    const decisionUnknownFiles = decisionFilePaths.filter((filePath) => !proposalSet.has(filePath));

    if (decisionUnknownFiles.length > 0) {
      issues.push({
        code: 'APPROVAL_SELECTED_FILES_NOT_IN_PROPOSAL',
        message: `Approval selected files are not present in proposal: ${decisionUnknownFiles.join(
          ', ',
        )}.`,
      });
    }

    const decisionMissingFromDiff = decisionFilePaths.filter((filePath) => !diffSet.has(filePath));

    if (decisionMissingFromDiff.length > 0) {
      issues.push({
        code: 'APPROVAL_SELECTED_FILES_NOT_IN_DIFF',
        message: `Approval selected files are not present in diff: ${decisionMissingFromDiff.join(
          ', ',
        )}.`,
      });
    }

    const diffNotApproved = diffFilePaths.filter((filePath) => !decisionSet.has(filePath));

    if (diffNotApproved.length > 0) {
      issues.push({
        code: 'DIFF_FILES_NOT_APPROVED',
        message: `Diff contains files not authorized by approval decision: ${diffNotApproved.join(
          ', ',
        )}.`,
      });
    }

    if (input.decision.action === 'approve') {
      const missingApprovedFiles = proposalFilePaths.filter(
        (filePath) => !decisionSet.has(filePath),
      );

      if (missingApprovedFiles.length > 0) {
        issues.push({
          code: 'APPROVE_ALL_MISSING_PROPOSAL_FILES',
          message: `Approve-all decision must include every proposal file: ${missingApprovedFiles.join(
            ', ',
          )}.`,
        });
      }
    }

    if (input.decision.action === 'approve_selected_files') {
      const proposalLooksUnfiltered = input.proposal.files.length !== decisionSet.size;

      if (proposalLooksUnfiltered) {
        issues.push({
          code: 'SELECTED_APPROVAL_REQUIRES_FILTERED_PROPOSAL',
          message:
            'Selected-file approval requires applying a proposal filtered to exactly the approved files.',
        });
      }
    }

    return {
      authorized: issues.length === 0,
      issues,
      selectedFilePaths: input.decision.selectedFilePaths,
    };
  }

  private normalizePath(filePath: string): string {
    return filePath
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '');
  }

  private hasDuplicates(values: string[]): boolean {
    return values.length !== new Set(values).size;
  }
}
