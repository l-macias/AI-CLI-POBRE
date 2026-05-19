import { ProtectedPathPolicy } from '../security/ProtectedPathPolicy.js';
import type {
  GuardrailInput,
  GuardrailIssue,
  GuardrailResult,
  RuntimeGuardrail,
} from '../types/GuardrailTypes.js';

export interface ProtectedFilesGuardOptions {
  pathPolicy?: ProtectedPathPolicy | undefined;
  projectRoot?: string | undefined;
}

export class ProtectedFilesGuard implements RuntimeGuardrail {
  public readonly kind = 'protected_files' as const;

  private readonly pathPolicy: ProtectedPathPolicy;
  private readonly projectRoot: string;

  public constructor(options: ProtectedFilesGuardOptions = {}) {
    this.pathPolicy = options.pathPolicy ?? new ProtectedPathPolicy();
    this.projectRoot = options.projectRoot ?? process.cwd();
  }

  public validate(input: GuardrailInput): GuardrailResult {
    const target = this.extractTarget(input.request.input);

    if (!target) {
      return {
        guardrail: this.kind,
        status: 'passed',
        issues: [],
      };
    }

    const result = this.pathPolicy.validateTarget({
      projectRoot: this.projectRoot,
      targetPath: target,
      operation: 'write',
      source: input.request.toolName,
    });

    const issues = result.findings.map((finding): GuardrailIssue => {
      return {
        code: this.mapFindingCode(finding.code),
        message: finding.message,
        severity:
          finding.severity === 'critical' || finding.severity === 'error' ? 'error' : 'warning',
        guardrail: this.kind,
      };
    });

    return {
      guardrail: this.kind,
      status: issues.length === 0 ? 'passed' : 'blocked',
      issues,
    };
  }

  private extractTarget(input: unknown): string | null {
    if (!this.isRecord(input)) {
      return null;
    }

    const target = input['target'];

    if (typeof target !== 'string') {
      return null;
    }

    return target;
  }

  private mapFindingCode(code: string): string {
    if (code === 'PROTECTED_PATH_TARGET_BLOCKED') {
      return 'PROTECTED_FILE_BLOCKED';
    }

    return code;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
