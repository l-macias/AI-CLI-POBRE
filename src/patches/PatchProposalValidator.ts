import type {
  PatchProposalRiskLevel,
  PatchProposalValidationIssue,
  PatchProposalValidationResult,
  RuntimePatchProposal,
} from './PatchProposal.js';
import { PatchRiskPolicy } from './PatchRiskPolicy.js';

const protectedSegments = ['.env', '.git', 'node_modules', 'dist', 'build', '.next'];

export interface PatchProposalValidatorOptions {
  riskPolicy?: PatchRiskPolicy | undefined;
}

export class PatchProposalValidator {
  private readonly riskPolicy: PatchRiskPolicy;

  public constructor(options: PatchProposalValidatorOptions = {}) {
    this.riskPolicy = options.riskPolicy ?? new PatchRiskPolicy();
  }

  public validate(proposal: RuntimePatchProposal): PatchProposalValidationResult {
    const issues: PatchProposalValidationIssue[] = [];

    if (proposal.summary.trim().length < 8) {
      issues.push({
        code: 'PATCH_SUMMARY_TOO_SHORT',
        message: 'Patch proposal summary is too short.',
        severity: 'error',
      });
    }

    if (proposal.files.length === 0) {
      issues.push({
        code: 'PATCH_FILES_REQUIRED',
        message: 'Patch proposal must include at least one file change.',
        severity: 'error',
      });
    }

    const policyResult = this.riskPolicy.analyze(proposal.files);

    if (this.riskRank(proposal.riskLevel) < this.riskRank(policyResult.highestRisk)) {
      issues.push({
        code: 'PATCH_PROPOSAL_RISK_UNDERSTATED',
        message: `Patch proposal riskLevel is ${proposal.riskLevel}, but policy requires ${policyResult.highestRisk}.`,
        severity: 'error',
      });
    }

    for (const policyRisk of policyResult.risks) {
      if (!proposal.risks.some((risk) => risk.code === policyRisk.code)) {
        issues.push({
          code: 'PATCH_POLICY_RISK_MISSING',
          message: `Patch proposal risks are missing policy risk: ${policyRisk.code}.`,
          severity: policyRisk.level === 'high' ? 'error' : 'warning',
        });
      }
    }

    const seenPaths = new Set<string>();

    for (const file of proposal.files) {
      const normalizedPath = this.normalizePath(file.path);
      const policyRiskLevel = this.riskPolicy.riskForFile({
        path: file.path,
        operation: file.operation,
        totalFiles: proposal.files.length,
      });

      if (seenPaths.has(normalizedPath)) {
        issues.push({
          code: 'DUPLICATED_PATCH_FILE',
          message: `Patch proposal contains duplicated file path: ${file.path}`,
          path: file.path,
          severity: 'error',
        });
      }

      seenPaths.add(normalizedPath);

      if (this.isAbsolutePath(normalizedPath)) {
        issues.push({
          code: 'ABSOLUTE_PATCH_PATH_NOT_ALLOWED',
          message: 'Patch proposal paths must be project-relative.',
          path: file.path,
          severity: 'error',
        });
      }

      if (this.hasProtectedSegment(normalizedPath)) {
        issues.push({
          code: 'PROTECTED_PATCH_PATH_NOT_ALLOWED',
          message: 'Patch proposal cannot target protected paths.',
          path: file.path,
          severity: 'error',
        });
      }

      if ((file.operation === 'modify' || file.operation === 'create') && file.content === null) {
        issues.push({
          code: 'PATCH_CONTENT_REQUIRED',
          message: `${file.operation} operations must include content.`,
          path: file.path,
          severity: 'error',
        });
      }

      if (file.operation === 'modify' && file.beforeHash === null) {
        issues.push({
          code: 'PATCH_BEFORE_HASH_REQUIRED',
          message: 'Modify operations must include a beforeHash.',
          path: file.path,
          severity: 'error',
        });
      }

      if (file.operation === 'delete') {
        issues.push({
          code: 'PATCH_DELETE_BLOCKED',
          message: 'Delete operations are blocked in this proposal flow.',
          path: file.path,
          severity: 'error',
        });
      }

      if (file.reason.trim().length < 10) {
        issues.push({
          code: 'PATCH_REASON_TOO_WEAK',
          message: 'Patch file change reason is too short.',
          path: file.path,
          severity: 'warning',
        });
      }

      if (file.changesSummary.length === 0) {
        issues.push({
          code: 'PATCH_FILE_SUMMARY_REQUIRED',
          message: 'Patch file change must include at least one changesSummary item.',
          path: file.path,
          severity: 'warning',
        });
      }

      if (!file.userSelectable) {
        issues.push({
          code: 'PATCH_FILE_NOT_SELECTABLE',
          message: 'Patch file changes must remain selectable for file-level approval.',
          path: file.path,
          severity: 'error',
        });
      }

      if (!this.isValidRiskLevel(file.riskLevel)) {
        issues.push({
          code: 'PATCH_FILE_RISK_INVALID',
          message: 'Patch file change has an invalid risk level.',
          path: file.path,
          severity: 'error',
        });
      }

      if (this.riskRank(file.riskLevel) < this.riskRank(policyRiskLevel)) {
        issues.push({
          code: 'PATCH_FILE_RISK_UNDERSTATED',
          message: `Patch file riskLevel is ${file.riskLevel}, but policy requires ${policyRiskLevel}.`,
          path: file.path,
          severity: 'error',
        });
      }
    }

    for (const verifyCommand of proposal.verifyCommands) {
      const commandLine = [verifyCommand.command, ...verifyCommand.args].join(' ');

      if (!verifyCommand.requiresApproval) {
        issues.push({
          code: 'PATCH_VERIFY_REQUIRES_APPROVAL',
          message: 'Patch verify commands must require approval.',
          severity: 'error',
        });
      }

      if (!this.isAllowedVerifyCommand(commandLine)) {
        issues.push({
          code: 'PATCH_VERIFY_COMMAND_NOT_ALLOWED',
          message: `Verify command is not allowed: ${commandLine}`,
          severity: 'error',
        });
      }
    }

    if (!proposal.requiresApproval) {
      issues.push({
        code: 'PATCH_PROPOSAL_REQUIRES_APPROVAL',
        message: 'Patch proposals must require approval.',
        severity: 'error',
      });
    }

    return {
      valid: issues.every((issue) => issue.severity !== 'error'),
      issues,
    };
  }

  private normalizePath(path: string): string {
    return path
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '');
  }

  private isAbsolutePath(path: string): boolean {
    return /^[a-z]:\//i.test(path) || path.startsWith('/');
  }

  private hasProtectedSegment(path: string): boolean {
    const loweredPath = path.toLowerCase();
    const segments = loweredPath.split('/');

    return protectedSegments.some((segment) => segments.includes(segment));
  }

  private isAllowedVerifyCommand(commandLine: string): boolean {
    return (
      commandLine === 'npm run build' ||
      commandLine === 'npm run lint' ||
      commandLine === 'npm run typecheck' ||
      commandLine === 'tsc --noEmit'
    );
  }

  private isValidRiskLevel(value: string): value is PatchProposalRiskLevel {
    return value === 'low' || value === 'medium' || value === 'high';
  }

  private riskRank(riskLevel: PatchProposalRiskLevel): number {
    if (riskLevel === 'high') {
      return 3;
    }

    if (riskLevel === 'medium') {
      return 2;
    }

    return 1;
  }
}
