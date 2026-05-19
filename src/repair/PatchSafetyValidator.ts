import { PatchThreatAnalyzer } from '../security/PatchThreatAnalyzer.js';
import { ProtectedPathPolicy } from '../security/ProtectedPathPolicy.js';
import type { SecurityFinding } from '../security/SecurityReviewTypes.js';
import type {
  PatchOperation,
  PatchProposal,
  PatchValidationIssue,
  PatchValidationResult,
  RepairRequest,
} from '../types/RepairTypes.js';

export interface PatchSafetyValidatorOptions {
  pathPolicy?: ProtectedPathPolicy | undefined;
  patchThreatAnalyzer?: PatchThreatAnalyzer | undefined;
}

export class PatchSafetyValidator {
  private readonly pathPolicy: ProtectedPathPolicy;
  private readonly patchThreatAnalyzer: PatchThreatAnalyzer;

  public constructor(options: PatchSafetyValidatorOptions = {}) {
    this.pathPolicy = options.pathPolicy ?? new ProtectedPathPolicy();
    this.patchThreatAnalyzer = options.patchThreatAnalyzer ?? new PatchThreatAnalyzer();
  }

  public validate(input: {
    request: RepairRequest;
    proposal: PatchProposal;
  }): PatchValidationResult {
    const issues: PatchValidationIssue[] = [];

    const allowedTargets = new Set(input.request.targetFiles.map((file) => file.relativePath));

    if (input.proposal.operations.length === 0) {
      issues.push({
        code: 'PATCH_HAS_NO_OPERATIONS',
        message: 'Patch proposal has no operations.',
        severity: 'error',
      });
    }

    for (const operation of input.proposal.operations) {
      const pathResult = this.pathPolicy.validateTarget({
        projectRoot: input.request.projectRoot,
        targetPath: operation.targetFile,
        operation: 'patch',
        source: 'patch-safety-validator',
      });

      issues.push(
        ...pathResult.findings.map((finding): PatchValidationIssue => {
          return {
            code: this.mapProtectedPathFindingCode(operation, finding.code),
            message: finding.message,
            severity:
              finding.severity === 'critical' || finding.severity === 'error' ? 'error' : 'warning',
          };
        }),
      );

      if (!allowedTargets.has(operation.targetFile)) {
        issues.push({
          code: 'PATCH_TARGET_NOT_IN_REPAIR_CONTEXT',
          message: `Patch targets a file outside repair context: ${operation.targetFile}`,
          severity: 'error',
        });
      }

      if (operation.kind === 'delete_file') {
        issues.push({
          code: 'PATCH_DELETE_NOT_ALLOWED',
          message: `Delete operation is not allowed in repair flow: ${operation.targetFile}`,
          severity: 'error',
        });
      }

      if (
        (operation.kind === 'replace_file' || operation.kind === 'edit_file') &&
        typeof operation.newContent !== 'string'
      ) {
        issues.push({
          code: 'PATCH_NEW_CONTENT_REQUIRED',
          message: `Operation requires newContent: ${operation.targetFile}`,
          severity: 'error',
        });
      }
    }

    const threatAnalysis = this.patchThreatAnalyzer.analyze({
      proposal: input.proposal,
      source: 'patch-safety-validator',
    });

    issues.push(
      ...threatAnalysis.findings.map((finding) => {
        return this.securityFindingToPatchValidationIssue(finding);
      }),
    );

    return {
      valid: !issues.some((issue) => issue.severity === 'error'),
      issues,
    };
  }

  private securityFindingToPatchValidationIssue(finding: SecurityFinding): PatchValidationIssue {
    return {
      code: this.mapThreatFindingCode(finding.code),
      message: finding.message,
      severity:
        finding.severity === 'critical' || finding.severity === 'error' ? 'error' : 'warning',
    };
  }

  private mapThreatFindingCode(code: string): string {
    if (code.startsWith('PATCH_THREAT_')) {
      return code.replace(/^PATCH_THREAT_/, 'PATCH_SAFETY_THREAT_');
    }

    if (code.startsWith('PROMPT_INJECTION_')) {
      return `PATCH_SAFETY_THREAT_${code}`;
    }

    if (code.startsWith('SECRET_')) {
      return `PATCH_SAFETY_THREAT_${code}`;
    }

    return `PATCH_SAFETY_THREAT_${code}`;
  }

  private mapProtectedPathFindingCode(operation: PatchOperation, code: string): string {
    if (code === 'PROTECTED_PATH_TARGET_BLOCKED' && this.isSecretFileName(operation.targetFile)) {
      return 'PATCH_TARGETS_SECRET_FILE';
    }

    if (code === 'PROTECTED_PATH_TRAVERSAL_BLOCKED') {
      return 'PATCH_TARGET_PATH_TRAVERSAL';
    }

    if (code === 'PROTECTED_PATH_ABSOLUTE_BLOCKED') {
      return 'PATCH_TARGET_ABSOLUTE_PATH';
    }

    if (code === 'PROTECTED_PATH_ROOT_ESCAPE_BLOCKED') {
      return 'PATCH_TARGET_ROOT_ESCAPE';
    }

    return `PATCH_TARGET_${code}`;
  }

  private isSecretFileName(targetFile: string): boolean {
    const normalized = targetFile.trim().replaceAll('\\', '/').toLowerCase();
    const baseName = normalized.split('/').at(-1) ?? normalized;

    return (
      baseName === '.env' ||
      baseName === '.env.local' ||
      baseName === '.env.production' ||
      baseName === '.env.development' ||
      baseName === '.env.test' ||
      baseName === '.npmrc' ||
      baseName === '.pypirc' ||
      baseName === '.netrc' ||
      baseName === 'id_rsa' ||
      baseName === 'id_ed25519'
    );
  }
}
