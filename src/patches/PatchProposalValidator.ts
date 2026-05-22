import type {
  PatchProposalValidationIssue,
  PatchProposalValidationResult,
  RuntimePatchProposal,
} from './PatchProposal.js';

const protectedSegments = ['.env', '.git', 'node_modules', 'dist', 'build', '.next'];

export class PatchProposalValidator {
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

    const seenPaths = new Set<string>();

    for (const file of proposal.files) {
      const normalizedPath = this.normalizePath(file.path);

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
          message: 'Delete operations are blocked in Session 85 proposal flow.',
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
}
