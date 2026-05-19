import type {
  ScaffoldFileOperationKind,
  ScaffoldModuleKind,
  ScaffoldProposal,
  ScaffoldProposalValidationIssue,
  ScaffoldRiskLevel,
} from './ScaffoldTypes.js';

const allowedFileKinds = new Set<ScaffoldFileOperationKind>(['create_file', 'replace_file']);
const allowedModuleKinds = new Set<ScaffoldModuleKind>([
  'backend',
  'frontend',
  'fullstack',
  'library',
  'generic',
]);
const allowedRiskLevels = new Set<ScaffoldRiskLevel>(['low', 'medium', 'high']);

export class ScaffoldProposalSchema {
  public validate(value: unknown): {
    valid: boolean;
    proposal?: ScaffoldProposal | undefined;
    issues: ScaffoldProposalValidationIssue[];
  } {
    const issues: ScaffoldProposalValidationIssue[] = [];

    if (!this.isRecord(value)) {
      return {
        valid: false,
        issues: [
          {
            code: 'SCAFFOLD_PROPOSAL_ROOT_INVALID',
            message: 'Scaffold proposal must be a JSON object.',
            severity: 'error',
          },
        ],
      };
    }

    const id = this.readRequiredString(value, 'id', issues);
    const summary = this.readRequiredString(value, 'summary', issues);
    const moduleName = this.readRequiredString(value, 'moduleName', issues);
    const moduleKind = this.readModuleKind(value['moduleKind'], issues);
    const targetRoot = this.readRequiredString(value, 'targetRoot', issues);
    const riskLevel = this.readRiskLevel(value['riskLevel'], issues);
    const explanation = this.readRequiredString(value, 'explanation', issues);
    const files = this.readFiles(value['files'], issues);

    if (issues.some((issue) => issue.severity === 'error')) {
      return {
        valid: false,
        issues,
      };
    }

    return {
      valid: true,
      proposal: {
        id,
        summary,
        moduleName,
        moduleKind,
        targetRoot,
        riskLevel,
        files,
        explanation,
      },
      issues,
    };
  }

  private readFiles(
    value: unknown,
    issues: ScaffoldProposalValidationIssue[],
  ): ScaffoldProposal['files'] {
    if (!Array.isArray(value)) {
      issues.push({
        code: 'SCAFFOLD_PROPOSAL_FILES_INVALID',
        message: 'Scaffold proposal files must be an array.',
        severity: 'error',
      });

      return [];
    }

    if (value.length === 0) {
      issues.push({
        code: 'SCAFFOLD_PROPOSAL_FILES_EMPTY',
        message: 'Scaffold proposal must contain at least one file.',
        severity: 'error',
      });

      return [];
    }

    return value.flatMap((item, index) => {
      if (!this.isRecord(item)) {
        issues.push({
          code: 'SCAFFOLD_PROPOSAL_FILE_INVALID',
          message: `Scaffold proposal file at index ${String(index)} must be an object.`,
          severity: 'error',
        });

        return [];
      }

      const kind = this.readFileKind(item['kind'], issues, index);
      const targetFile = this.readRequiredString(item, 'targetFile', issues, index);
      const content = this.readRequiredString(item, 'content', issues, index);
      const reason = this.readRequiredString(item, 'reason', issues, index);

      if (!kind || targetFile.length === 0 || content.length === 0 || reason.length === 0) {
        return [];
      }

      return [
        {
          kind,
          targetFile,
          content,
          reason,
        },
      ];
    });
  }

  private readRequiredString(
    record: Record<string, unknown>,
    key: string,
    issues: ScaffoldProposalValidationIssue[],
    index?: number,
  ): string {
    const value = record[key];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }

    issues.push({
      code: 'SCAFFOLD_PROPOSAL_FIELD_REQUIRED',
      message:
        index === undefined
          ? `Scaffold proposal field is required: ${key}`
          : `Scaffold proposal file ${String(index)} field is required: ${key}`,
      severity: 'error',
    });

    return '';
  }

  private readModuleKind(
    value: unknown,
    issues: ScaffoldProposalValidationIssue[],
  ): ScaffoldModuleKind {
    if (typeof value === 'string' && allowedModuleKinds.has(value as ScaffoldModuleKind)) {
      return value as ScaffoldModuleKind;
    }

    issues.push({
      code: 'SCAFFOLD_PROPOSAL_MODULE_KIND_INVALID',
      message: `Unsupported scaffold module kind: ${String(value)}`,
      severity: 'error',
    });

    return 'generic';
  }

  private readRiskLevel(
    value: unknown,
    issues: ScaffoldProposalValidationIssue[],
  ): ScaffoldRiskLevel {
    if (typeof value === 'string' && allowedRiskLevels.has(value as ScaffoldRiskLevel)) {
      return value as ScaffoldRiskLevel;
    }

    issues.push({
      code: 'SCAFFOLD_PROPOSAL_RISK_LEVEL_INVALID',
      message: `Unsupported scaffold risk level: ${String(value)}`,
      severity: 'error',
    });

    return 'high';
  }

  private readFileKind(
    value: unknown,
    issues: ScaffoldProposalValidationIssue[],
    index: number,
  ): ScaffoldFileOperationKind | undefined {
    if (typeof value === 'string' && allowedFileKinds.has(value as ScaffoldFileOperationKind)) {
      return value as ScaffoldFileOperationKind;
    }

    issues.push({
      code: 'SCAFFOLD_PROPOSAL_FILE_KIND_INVALID',
      message: `Unsupported scaffold file operation kind at index ${String(index)}: ${String(
        value,
      )}`,
      severity: 'error',
    });

    return undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
