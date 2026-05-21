import { PatchQualityEvaluator } from '../repair/PatchQualityEvaluator.js';
import { PatchThreatAnalyzer } from '../security/PatchThreatAnalyzer.js';
import { ProtectedPathPolicy } from '../security/ProtectedPathPolicy.js';
import type { SecurityFinding } from '../security/SecurityReviewTypes.js';
import type { PatchOperation, PatchQualityIssue } from '../types/RepairTypes.js';
import type { PatchApplyIssue, PatchApplyPlan } from './PatchApplyTypes.js';

export interface PatchApplyValidatorOptions {
  pathPolicy?: ProtectedPathPolicy | undefined;
  patchThreatAnalyzer?: PatchThreatAnalyzer | undefined;
  patchQualityEvaluator?: PatchQualityEvaluator | undefined;
}

export class PatchApplyValidator {
  private readonly pathPolicy: ProtectedPathPolicy;
  private readonly patchThreatAnalyzer: PatchThreatAnalyzer;
  private readonly patchQualityEvaluator: PatchQualityEvaluator;

  public constructor(options: PatchApplyValidatorOptions = {}) {
    this.pathPolicy = options.pathPolicy ?? new ProtectedPathPolicy();
    this.patchThreatAnalyzer = options.patchThreatAnalyzer ?? new PatchThreatAnalyzer();
    this.patchQualityEvaluator = options.patchQualityEvaluator ?? new PatchQualityEvaluator();
  }

  public validate(plan: PatchApplyPlan): PatchApplyIssue[] {
    const issues: PatchApplyIssue[] = [];

    for (const operation of plan.operations) {
      const pathResult = this.pathPolicy.validateTarget({
        projectRoot: plan.projectRoot,
        targetPath: operation.targetFile,
        operation: 'patch',
        source: 'patch-apply-validator',
      });

      issues.push(
        ...pathResult.findings.map((finding): PatchApplyIssue => {
          return {
            code: this.mapProtectedPathFindingCode(operation, finding.code),
            message: finding.message,
            severity:
              finding.severity === 'critical' || finding.severity === 'error' ? 'error' : 'warning',
          };
        }),
      );

      if (
        (operation.kind === 'replace_file' ||
          operation.kind === 'edit_file' ||
          operation.kind === 'create_file') &&
        typeof operation.newContent !== 'string'
      ) {
        issues.push({
          code: 'PATCH_APPLY_NEW_CONTENT_REQUIRED',
          message: `Patch operation requires newContent: ${operation.targetFile}`,
          severity: 'error',
        });
      }
    }

    const threatAnalysis = this.patchThreatAnalyzer.analyze({
      proposal: plan.proposal,
      source: 'patch-apply-validator',
    });

    issues.push(
      ...threatAnalysis.findings.map((finding) => {
        return this.securityFindingToPatchApplyIssue(finding);
      }),
    );

    const qualityEvaluation = this.patchQualityEvaluator.evaluate({
      proposal: plan.proposal,
    });

    issues.push(
      ...qualityEvaluation.issues.map((issue) => {
        return this.qualityIssueToPatchApplyIssue(issue);
      }),
    );

    return issues;
  }

  private qualityIssueToPatchApplyIssue(issue: PatchQualityIssue): PatchApplyIssue {
    return {
      code: issue.code.replace(/^PATCH_QUALITY_/, 'PATCH_APPLY_QUALITY_'),
      message: issue.message,
      severity: issue.severity,
    };
  }

  private securityFindingToPatchApplyIssue(finding: SecurityFinding): PatchApplyIssue {
    return {
      code: this.mapThreatFindingCode(finding.code),
      message: finding.message,
      severity:
        finding.severity === 'critical' || finding.severity === 'error' ? 'error' : 'warning',
    };
  }

  private mapThreatFindingCode(code: string): string {
    if (code.startsWith('PATCH_THREAT_')) {
      return code.replace(/^PATCH_THREAT_/, 'PATCH_APPLY_THREAT_');
    }

    if (code.startsWith('PROMPT_INJECTION_')) {
      return `PATCH_APPLY_THREAT_${code}`;
    }

    if (code.startsWith('SECRET_')) {
      return `PATCH_APPLY_THREAT_${code}`;
    }

    return `PATCH_APPLY_THREAT_${code}`;
  }

  private mapProtectedPathFindingCode(operation: PatchOperation, code: string): string {
    if (code === 'PROTECTED_PATH_TRAVERSAL_BLOCKED') {
      return 'PATCH_APPLY_PATH_TRAVERSAL';
    }

    if (code === 'PROTECTED_PATH_TARGET_BLOCKED' && this.isSecretFileName(operation.targetFile)) {
      return 'PATCH_APPLY_SECRET_FILE_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_ABSOLUTE_BLOCKED') {
      return 'PATCH_APPLY_ABSOLUTE_PATH_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_ROOT_ESCAPE_BLOCKED') {
      return 'PATCH_APPLY_ROOT_ESCAPE_BLOCKED';
    }

    return `PATCH_APPLY_${code}`;
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
