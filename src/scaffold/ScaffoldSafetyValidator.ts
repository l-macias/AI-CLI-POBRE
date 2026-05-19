import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { PatchThreatAnalyzer } from '../security/PatchThreatAnalyzer.js';
import { ProtectedPathPolicy } from '../security/ProtectedPathPolicy.js';
import { SecretLeakDetector } from '../security/SecretLeakDetector.js';
import type { PatchProposal } from '../types/RepairTypes.js';
import type {
  ScaffoldFileProposal,
  ScaffoldProposal,
  ScaffoldProposalValidationIssue,
  ScaffoldRequest,
} from './ScaffoldTypes.js';

export interface ScaffoldSafetyValidatorOptions {
  protectedPathPolicy?: ProtectedPathPolicy | undefined;
  secretLeakDetector?: SecretLeakDetector | undefined;
  patchThreatAnalyzer?: PatchThreatAnalyzer | undefined;
}

export interface ScaffoldSafetyValidationInput {
  request: ScaffoldRequest;
  proposal: ScaffoldProposal;
}

export interface ScaffoldSafetyValidationResult {
  safe: boolean;
  issues: ScaffoldProposalValidationIssue[];
}

export class ScaffoldSafetyValidator {
  private readonly protectedPathPolicy: ProtectedPathPolicy;
  private readonly secretLeakDetector: SecretLeakDetector;
  private readonly patchThreatAnalyzer: PatchThreatAnalyzer;

  public constructor(options: ScaffoldSafetyValidatorOptions = {}) {
    this.secretLeakDetector = options.secretLeakDetector ?? new SecretLeakDetector();
    this.protectedPathPolicy = options.protectedPathPolicy ?? new ProtectedPathPolicy();
    this.patchThreatAnalyzer =
      options.patchThreatAnalyzer ??
      new PatchThreatAnalyzer({
        secretLeakDetector: this.secretLeakDetector,
      });
  }

  public async validate(
    input: ScaffoldSafetyValidationInput,
  ): Promise<ScaffoldSafetyValidationResult> {
    const issues: ScaffoldProposalValidationIssue[] = [];

    issues.push(...this.validateProposalShape(input));
    issues.push(...this.validateDuplicateFiles(input.proposal.files));
    issues.push(...this.validateTargetRoot(input));

    for (const file of input.proposal.files) {
      issues.push(...this.validateFileUnderTargetRoot(input.request, file));
      issues.push(...(await this.validateFilePath(input.request, file)));
      issues.push(...(await this.validateOverwritePolicy(input.request, file)));
      issues.push(...this.validateSecretContent(file));
    }

    issues.push(...this.validatePatchThreats(input.proposal));

    return {
      safe: !issues.some((issue) => issue.severity === 'error'),
      issues,
    };
  }

  private validateProposalShape(
    input: ScaffoldSafetyValidationInput,
  ): ScaffoldProposalValidationIssue[] {
    const issues: ScaffoldProposalValidationIssue[] = [];

    if (input.proposal.moduleName !== input.request.intent.normalizedName) {
      issues.push({
        code: 'SCAFFOLD_SAFETY_MODULE_NAME_MISMATCH',
        message: `Proposal moduleName "${input.proposal.moduleName}" does not match requested module "${input.request.intent.normalizedName}".`,
        severity: 'error',
      });
    }

    if (input.proposal.moduleKind !== input.request.intent.moduleKind) {
      issues.push({
        code: 'SCAFFOLD_SAFETY_MODULE_KIND_MISMATCH',
        message: `Proposal moduleKind "${input.proposal.moduleKind}" does not match requested kind "${input.request.intent.moduleKind}".`,
        severity: 'error',
      });
    }

    if (input.proposal.targetRoot !== input.request.intent.normalizedTargetPath) {
      issues.push({
        code: 'SCAFFOLD_SAFETY_TARGET_ROOT_MISMATCH',
        message: `Proposal targetRoot "${input.proposal.targetRoot}" does not match requested target "${input.request.intent.normalizedTargetPath}".`,
        severity: 'error',
      });
    }

    if (input.proposal.files.length === 0) {
      issues.push({
        code: 'SCAFFOLD_SAFETY_NO_FILES',
        message: 'Scaffold proposal must include at least one file.',
        severity: 'error',
      });
    }

    return issues;
  }

  private validateDuplicateFiles(
    files: readonly ScaffoldFileProposal[],
  ): ScaffoldProposalValidationIssue[] {
    const issues: ScaffoldProposalValidationIssue[] = [];
    const seen = new Set<string>();

    for (const file of files) {
      const normalized = this.normalizeProjectPath(file.targetFile).toLowerCase();

      if (seen.has(normalized)) {
        issues.push({
          code: 'SCAFFOLD_SAFETY_DUPLICATE_FILE',
          message: `Scaffold proposal contains duplicate target file: ${file.targetFile}`,
          severity: 'error',
        });
      }

      seen.add(normalized);
    }

    return issues;
  }

  private validateTargetRoot(
    input: ScaffoldSafetyValidationInput,
  ): ScaffoldProposalValidationIssue[] {
    const proposalRoot = this.normalizeProjectPath(input.proposal.targetRoot);
    const requestedRoot = this.normalizeProjectPath(input.request.intent.normalizedTargetPath);

    if (proposalRoot !== requestedRoot) {
      return [
        {
          code: 'SCAFFOLD_SAFETY_TARGET_ROOT_MISMATCH',
          message: `Proposal targetRoot "${proposalRoot}" must equal requested target "${requestedRoot}".`,
          severity: 'error',
        },
      ];
    }

    return [];
  }

  private validateFileUnderTargetRoot(
    request: ScaffoldRequest,
    file: ScaffoldFileProposal,
  ): ScaffoldProposalValidationIssue[] {
    const targetRoot = this.normalizeProjectPath(request.intent.normalizedTargetPath);
    const targetFile = this.normalizeProjectPath(file.targetFile);

    if (targetFile === targetRoot || targetFile.startsWith(`${targetRoot}/`)) {
      return [];
    }

    return [
      {
        code: 'SCAFFOLD_SAFETY_FILE_OUTSIDE_TARGET_ROOT',
        message: `Scaffold file "${file.targetFile}" is outside requested target root "${targetRoot}".`,
        severity: 'error',
      },
    ];
  }

  private async validateFilePath(
    request: ScaffoldRequest,
    file: ScaffoldFileProposal,
  ): Promise<ScaffoldProposalValidationIssue[]> {
    const result = await this.protectedPathPolicy.validateTargetWithFilesystem({
      projectRoot: request.projectRoot,
      targetPath: file.targetFile,
      operation: file.kind === 'replace_file' ? 'edit' : 'create',
      source: 'scaffold-safety-validator',
    });

    return result.findings.map((finding): ScaffoldProposalValidationIssue => {
      return {
        code: this.mapProtectedPathIssueCode(finding.code),
        message: finding.message,
        severity:
          finding.severity === 'critical' || finding.severity === 'error' ? 'error' : 'warning',
      };
    });
  }

  private async validateOverwritePolicy(
    request: ScaffoldRequest,
    file: ScaffoldFileProposal,
  ): Promise<ScaffoldProposalValidationIssue[]> {
    const absoluteTarget = join(request.projectRoot, this.normalizeProjectPath(file.targetFile));
    const exists = await this.exists(absoluteTarget);

    if (file.kind === 'replace_file' && request.intent.overwriteExisting !== true) {
      return [
        {
          code: 'SCAFFOLD_SAFETY_REPLACE_REQUIRES_OVERWRITE',
          message: `replace_file is not allowed without overwriteExisting=true: ${file.targetFile}`,
          severity: 'error',
        },
      ];
    }

    if (file.kind === 'create_file' && exists && request.intent.overwriteExisting !== true) {
      return [
        {
          code: 'SCAFFOLD_SAFETY_CREATE_TARGET_EXISTS',
          message: `create_file target already exists and overwriteExisting=false: ${file.targetFile}`,
          severity: 'error',
        },
      ];
    }

    return [];
  }

  private validateSecretContent(file: ScaffoldFileProposal): ScaffoldProposalValidationIssue[] {
    const scan = this.secretLeakDetector.scanText({
      source: 'scaffold-safety-validator',
      filePath: file.targetFile,
      content: file.content,
    });

    return scan.findings.map((finding): ScaffoldProposalValidationIssue => {
      return {
        code: `SCAFFOLD_SAFETY_${finding.code}`,
        message: finding.message,
        severity:
          finding.severity === 'critical' || finding.severity === 'error' ? 'error' : 'warning',
      };
    });
  }

  private validatePatchThreats(proposal: ScaffoldProposal): ScaffoldProposalValidationIssue[] {
    const patchProposal = this.toPatchProposal(proposal);
    const analysis = this.patchThreatAnalyzer.analyze({
      proposal: patchProposal,
      source: 'scaffold-safety-validator',
    });

    return analysis.findings.map((finding): ScaffoldProposalValidationIssue => {
      return {
        code: `SCAFFOLD_SAFETY_${finding.code}`,
        message: finding.message,
        severity:
          finding.severity === 'critical' || finding.severity === 'error' ? 'error' : 'warning',
      };
    });
  }

  private toPatchProposal(proposal: ScaffoldProposal): PatchProposal {
    return {
      id: proposal.id,
      summary: proposal.summary,
      riskLevel: proposal.riskLevel,
      operations: proposal.files.map((file) => {
        return {
          kind: file.kind,
          targetFile: file.targetFile,
          newContent: file.content,
          reason: file.reason,
        };
      }),
      explanation: proposal.explanation,
    };
  }

  private normalizeProjectPath(value: string): string {
    return value
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '')
      .replace(/\/+$/g, '');
  }

  private async exists(targetPath: string): Promise<boolean> {
    try {
      await access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  private mapProtectedPathIssueCode(code: string): string {
    if (code === 'PROTECTED_PATH_EMPTY_TARGET') {
      return 'SCAFFOLD_SAFETY_EMPTY_TARGET';
    }

    if (code === 'PROTECTED_PATH_NULL_BYTE') {
      return 'SCAFFOLD_SAFETY_NULL_BYTE';
    }

    if (code === 'PROTECTED_PATH_ABSOLUTE_BLOCKED') {
      return 'SCAFFOLD_SAFETY_ABSOLUTE_PATH_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_TRAVERSAL_BLOCKED') {
      return 'SCAFFOLD_SAFETY_PATH_TRAVERSAL_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_ROOT_ESCAPE_BLOCKED') {
      return 'SCAFFOLD_SAFETY_ROOT_ESCAPE_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_TARGET_BLOCKED') {
      return 'SCAFFOLD_SAFETY_PROTECTED_PATH_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_SYMLINK_BLOCKED') {
      return 'SCAFFOLD_SAFETY_SYMLINK_BLOCKED';
    }

    if (code === 'PROTECTED_PATH_REALPATH_ESCAPE_BLOCKED') {
      return 'SCAFFOLD_SAFETY_REALPATH_ESCAPE_BLOCKED';
    }

    return `SCAFFOLD_SAFETY_${code}`;
  }
}
