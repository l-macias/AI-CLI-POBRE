import type {
  PatchOperation,
  PatchProposal,
  PatchQualityEvaluationInput,
  PatchQualityEvaluationResult,
  PatchQualityIssue,
  RepairRequest,
} from '../types/RepairTypes.js';

interface OperationEvaluationInput {
  proposal: PatchProposal;
  operation: PatchOperation;
  operationIndex: number;
  request?: RepairRequest | undefined;
}

const architectureSensitivePathPrefixes = [
  'src/core/',
  'src/agent/',
  'src/patch-apply/',
  'src/security/',
  'src/providers/',
  'src/types/',
  'src/workspace/',
  'src/tools/',
];

const architectureSensitiveExactPaths = [
  'package.json',
  'tsconfig.json',
  'eslint.config.js',
  'prettier.config.js',
  '.gitignore',
  '.gitattributes',
];

const weakReasonPatterns = [/^fix$/iu, /^update$/iu, /^change$/iu, /^because$/iu, /^needed$/iu];

export class PatchQualityEvaluator {
  public evaluate(input: PatchQualityEvaluationInput): PatchQualityEvaluationResult {
    const issues: PatchQualityIssue[] = [];

    issues.push(...this.evaluateProposalShape(input.proposal));

    input.proposal.operations.forEach((operation, operationIndex) => {
      issues.push(
        ...this.evaluateOperation({
          proposal: input.proposal,
          operation,
          operationIndex,
          request: input.request,
        }),
      );
    });

    issues.push(...this.evaluateCrossOperationQuality(input));

    return {
      acceptable: !issues.some((issue) => issue.severity === 'error'),
      issues,
    };
  }

  private evaluateProposalShape(proposal: PatchProposal): PatchQualityIssue[] {
    const issues: PatchQualityIssue[] = [];

    if (proposal.summary.trim().length < 8) {
      issues.push({
        code: 'PATCH_QUALITY_WEAK_SUMMARY',
        message: 'Patch summary is too short to explain intent.',
        severity: 'warning',
      });
    }

    if (proposal.explanation.trim().length < 12) {
      issues.push({
        code: 'PATCH_QUALITY_WEAK_EXPLANATION',
        message: 'Patch explanation is too short to justify safety and minimality.',
        severity: 'warning',
      });
    }

    if (proposal.riskLevel === 'low' && proposal.operations.length > 3) {
      issues.push({
        code: 'PATCH_QUALITY_LOW_RISK_MULTI_FILE_MISMATCH',
        message: 'Patch declares low risk but includes more than three operations.',
        severity: 'warning',
      });
    }

    return issues;
  }

  private evaluateOperation(input: OperationEvaluationInput): PatchQualityIssue[] {
    const issues: PatchQualityIssue[] = [];

    issues.push(...this.evaluateNoOp(input));
    issues.push(...this.evaluateReason(input));
    issues.push(...this.evaluateArchitecturalRisk(input));
    issues.push(...this.evaluateObjectiveAlignment(input));
    issues.push(...this.evaluateOperationKindRisk(input));

    return issues;
  }

  private evaluateNoOp(input: OperationEvaluationInput): PatchQualityIssue[] {
    if (
      (input.operation.kind === 'replace_file' || input.operation.kind === 'edit_file') &&
      typeof input.operation.newContent === 'string' &&
      input.operation.expectedCurrentContent === input.operation.newContent
    ) {
      return [
        {
          code: 'PATCH_QUALITY_NO_OP_OPERATION',
          message: `Patch operation does not change content: ${input.operation.targetFile}`,
          severity: 'warning',
          targetFile: input.operation.targetFile,
          operationIndex: input.operationIndex,
        },
      ];
    }

    if (
      input.operation.kind === 'create_file' &&
      typeof input.operation.newContent === 'string' &&
      input.operation.newContent.trim().length === 0
    ) {
      return [
        {
          code: 'PATCH_QUALITY_EMPTY_CREATED_FILE',
          message: `Patch creates an empty file: ${input.operation.targetFile}`,
          severity: 'warning',
          targetFile: input.operation.targetFile,
          operationIndex: input.operationIndex,
        },
      ];
    }

    return [];
  }

  private evaluateReason(input: OperationEvaluationInput): PatchQualityIssue[] {
    const reason = input.operation.reason.trim();

    if (reason.length < 10 || weakReasonPatterns.some((pattern) => pattern.test(reason))) {
      return [
        {
          code: 'PATCH_QUALITY_WEAK_OPERATION_REASON',
          message: `Patch operation reason is too weak: ${input.operation.targetFile}`,
          severity: 'warning',
          targetFile: input.operation.targetFile,
          operationIndex: input.operationIndex,
        },
      ];
    }

    return [];
  }

  private evaluateArchitecturalRisk(input: OperationEvaluationInput): PatchQualityIssue[] {
    if (!this.isArchitectureSensitivePath(input.operation.targetFile)) {
      return [];
    }

    const severity = input.proposal.riskLevel === 'low' ? 'warning' : 'info';

    return [
      {
        code: 'PATCH_QUALITY_ARCHITECTURE_SENSITIVE_EDIT',
        message: `Patch touches architecture-sensitive path: ${input.operation.targetFile}`,
        severity,
        targetFile: input.operation.targetFile,
        operationIndex: input.operationIndex,
      },
    ];
  }

  private evaluateObjectiveAlignment(input: OperationEvaluationInput): PatchQualityIssue[] {
    const request = input.request;

    if (!request) {
      return [];
    }

    const primaryTargets = new Set(
      request.targetFiles
        .filter((file) => file.role !== 'related_context' && file.editable !== false)
        .map((file) => file.relativePath),
    );

    const contextTarget = request.targetFiles.find((file) => {
      return file.relativePath === input.operation.targetFile;
    });

    if (!contextTarget) {
      return [
        {
          code: 'PATCH_QUALITY_TARGET_NOT_IN_CONTEXT',
          message: `Patch operation targets a file not included in repair context: ${input.operation.targetFile}`,
          severity: 'error',
          targetFile: input.operation.targetFile,
          operationIndex: input.operationIndex,
        },
      ];
    }

    if (!primaryTargets.has(input.operation.targetFile)) {
      return [
        {
          code: 'PATCH_QUALITY_TARGET_NOT_PRIMARY',
          message: `Patch operation targets a non-primary repair file: ${input.operation.targetFile}`,
          severity: 'error',
          targetFile: input.operation.targetFile,
          operationIndex: input.operationIndex,
        },
      ];
    }

    const relatedFinding = request.findings.some((finding) => {
      return (
        finding.relatedFile?.replaceAll('\\', '/').endsWith(input.operation.targetFile) === true
      );
    });

    if (!relatedFinding && request.findings.length > 0) {
      return [
        {
          code: 'PATCH_QUALITY_TARGET_HAS_NO_DIRECT_FINDING',
          message: `Patch target has no direct captured finding: ${input.operation.targetFile}`,
          severity: 'warning',
          targetFile: input.operation.targetFile,
          operationIndex: input.operationIndex,
        },
      ];
    }

    return [];
  }

  private evaluateOperationKindRisk(input: OperationEvaluationInput): PatchQualityIssue[] {
    if (input.operation.kind === 'create_file' && input.proposal.riskLevel === 'low') {
      return [
        {
          code: 'PATCH_QUALITY_LOW_RISK_CREATE_FILE',
          message: `Patch declares low risk but creates a new file: ${input.operation.targetFile}`,
          severity: 'warning',
          targetFile: input.operation.targetFile,
          operationIndex: input.operationIndex,
        },
      ];
    }

    if (input.operation.kind === 'delete_file') {
      return [
        {
          code: 'PATCH_QUALITY_DELETE_OPERATION_REQUIRES_REVIEW',
          message: `Patch includes delete operation: ${input.operation.targetFile}`,
          severity: 'warning',
          targetFile: input.operation.targetFile,
          operationIndex: input.operationIndex,
        },
      ];
    }

    return [];
  }

  private evaluateCrossOperationQuality(input: PatchQualityEvaluationInput): PatchQualityIssue[] {
    const issues: PatchQualityIssue[] = [];
    const seenTargets = new Set<string>();

    for (let index = 0; index < input.proposal.operations.length; index += 1) {
      const operation = input.proposal.operations[index];

      if (!operation) {
        continue;
      }

      if (seenTargets.has(operation.targetFile)) {
        issues.push({
          code: 'PATCH_QUALITY_DUPLICATE_TARGET',
          message: `Patch includes multiple operations for the same target: ${operation.targetFile}`,
          severity: 'warning',
          targetFile: operation.targetFile,
          operationIndex: index,
        });
      }

      seenTargets.add(operation.targetFile);
    }

    const allOperationsAreNoOp =
      input.proposal.operations.length > 0 &&
      input.proposal.operations.every((operation) => {
        return (
          (operation.kind === 'replace_file' || operation.kind === 'edit_file') &&
          typeof operation.newContent === 'string' &&
          operation.expectedCurrentContent === operation.newContent
        );
      });

    if (allOperationsAreNoOp) {
      issues.push({
        code: 'PATCH_QUALITY_ALL_OPERATIONS_NO_OP',
        message: 'Patch proposal contains only no-op operations.',
        severity: 'warning',
      });
    }

    return issues;
  }

  private isArchitectureSensitivePath(targetFile: string): boolean {
    const normalized = targetFile.replaceAll('\\', '/');

    return (
      architectureSensitiveExactPaths.includes(normalized) ||
      architectureSensitivePathPrefixes.some((prefix) => normalized.startsWith(prefix))
    );
  }
}
