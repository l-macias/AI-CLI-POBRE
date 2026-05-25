import type { PatchDiffPreview } from '../diff/PatchDiffTypes.js';
import type { RuntimePatchProposal } from './PatchProposal.js';
import { PatchProposalValidator } from './PatchProposalValidator.js';

export interface PatchApplySafetyGuardInput {
  proposal: RuntimePatchProposal;
  diff: PatchDiffPreview;
}

export interface PatchApplySafetyGuardIssue {
  code: string;
  message: string;
}

export interface PatchApplySafetyGuardResult {
  allowed: boolean;
  issues: PatchApplySafetyGuardIssue[];
}

export class PatchApplySafetyGuard {
  private readonly validator: PatchProposalValidator;

  public constructor(validator = new PatchProposalValidator()) {
    this.validator = validator;
  }

  public validate(input: PatchApplySafetyGuardInput): PatchApplySafetyGuardResult {
    const issues: PatchApplySafetyGuardIssue[] = [];

    const validation = this.validator.validate(input.proposal);

    for (const issue of validation.issues) {
      if (issue.severity === 'error') {
        issues.push({
          code: `VALIDATION_${issue.code}`,
          message: issue.path ? `${issue.message} Path: ${issue.path}` : issue.message,
        });
      }
    }

    if (input.proposal.status !== 'validated') {
      issues.push({
        code: 'PROPOSAL_NOT_VALIDATED',
        message: 'Patch apply requires a validated runtime patch proposal.',
      });
    }

    if (input.diff.proposalId !== input.proposal.id) {
      issues.push({
        code: 'DIFF_PROPOSAL_MISMATCH',
        message: `Diff proposalId ${input.diff.proposalId} does not match proposal id ${input.proposal.id}.`,
      });
    }

    if (input.diff.planId !== input.proposal.planId) {
      issues.push({
        code: 'DIFF_PLAN_MISMATCH',
        message: 'Diff planId does not match proposal planId.',
      });
    }

    if (input.diff.sessionId !== input.proposal.sessionId) {
      issues.push({
        code: 'DIFF_SESSION_MISMATCH',
        message: 'Diff sessionId does not match proposal sessionId.',
      });
    }

    if (input.diff.projectRoot !== input.proposal.projectRoot) {
      issues.push({
        code: 'DIFF_PROJECT_ROOT_MISMATCH',
        message: 'Diff projectRoot does not match proposal projectRoot.',
      });
    }

    if (!input.diff.safeToPreview) {
      issues.push({
        code: 'DIFF_NOT_SAFE_TO_PREVIEW',
        message: 'Patch apply requires a safe diff preview.',
      });
    }

    this.validateFileSet(input, issues);
    this.validateDiffFileMetadata(input, issues);

    return {
      allowed: issues.length === 0,
      issues,
    };
  }

  private validateFileSet(
    input: PatchApplySafetyGuardInput,
    issues: PatchApplySafetyGuardIssue[],
  ): void {
    const proposalPaths = input.proposal.files.map((file) => this.normalizePath(file.path));
    const diffPaths = input.diff.files.map((file) => this.normalizePath(file.path));

    const proposalSet = new Set(proposalPaths);
    const diffSet = new Set(diffPaths);

    const missingFromDiff = proposalPaths.filter((path) => !diffSet.has(path));
    const extraInDiff = diffPaths.filter((path) => !proposalSet.has(path));

    if (missingFromDiff.length > 0) {
      issues.push({
        code: 'DIFF_MISSING_PROPOSAL_FILES',
        message: `Diff is missing proposal files: ${missingFromDiff.join(', ')}.`,
      });
    }

    if (extraInDiff.length > 0) {
      issues.push({
        code: 'DIFF_HAS_EXTRA_FILES',
        message: `Diff contains files not present in proposal: ${extraInDiff.join(', ')}.`,
      });
    }

    if (proposalPaths.length !== proposalSet.size) {
      issues.push({
        code: 'PROPOSAL_DUPLICATED_FILES',
        message: 'Proposal contains duplicated file paths.',
      });
    }

    if (diffPaths.length !== diffSet.size) {
      issues.push({
        code: 'DIFF_DUPLICATED_FILES',
        message: 'Diff contains duplicated file paths.',
      });
    }
  }

  private validateDiffFileMetadata(
    input: PatchApplySafetyGuardInput,
    issues: PatchApplySafetyGuardIssue[],
  ): void {
    const diffByPath = new Map(
      input.diff.files.map((file) => [this.normalizePath(file.path), file]),
    );

    for (const file of input.proposal.files) {
      const diffFile = diffByPath.get(this.normalizePath(file.path));

      if (!diffFile) {
        continue;
      }

      if (diffFile.beforeHash !== file.beforeHash) {
        issues.push({
          code: 'DIFF_BEFORE_HASH_MISMATCH',
          message: `Diff beforeHash does not match proposal beforeHash for ${file.path}.`,
        });
      }

      const expectedStatus = this.expectedDiffStatus(file.operation);

      if (diffFile.status !== expectedStatus && diffFile.status !== 'unchanged') {
        issues.push({
          code: 'DIFF_STATUS_MISMATCH',
          message: `Diff status for ${file.path} is ${diffFile.status}, expected ${expectedStatus}.`,
        });
      }

      if (file.operation !== 'delete' && diffFile.afterContent !== file.content) {
        issues.push({
          code: 'DIFF_AFTER_CONTENT_MISMATCH',
          message: `Diff afterContent does not match proposal content for ${file.path}.`,
        });
      }

      if (file.operation === 'delete' && diffFile.afterContent !== null) {
        issues.push({
          code: 'DIFF_DELETE_AFTER_CONTENT_PRESENT',
          message: `Delete diff for ${file.path} must not include afterContent.`,
        });
      }
    }
  }

  private expectedDiffStatus(operation: RuntimePatchProposal['files'][number]['operation']) {
    if (operation === 'create') {
      return 'added';
    }

    if (operation === 'delete') {
      return 'deleted';
    }

    return 'modified';
  }

  private normalizePath(filePath: string): string {
    return filePath
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '');
  }
}
