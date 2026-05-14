import type {
  GuardrailInput,
  GuardrailIssue,
  GuardrailResult,
  RuntimeGuardrail,
} from '../types/GuardrailTypes.js';

const protectedPathSegments = [
  '.env',
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.wrangler',
  '.open-next',
];

export class ProtectedFilesGuard implements RuntimeGuardrail {
  public readonly kind = 'protected_files' as const;

  public validate(input: GuardrailInput): GuardrailResult {
    const issues: GuardrailIssue[] = [];
    const target = this.extractTarget(input.request.input);

    if (!target) {
      return {
        guardrail: this.kind,
        status: 'passed',
        issues,
      };
    }

    const normalizedTarget = this.normalizePath(target);

    if (this.isProtectedPath(normalizedTarget)) {
      issues.push({
        code: 'PROTECTED_FILE_BLOCKED',
        message: `Protected path blocked: ${target}`,
        severity: 'error',
        guardrail: this.kind,
      });
    }

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

  private normalizePath(target: string): string {
    return target
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '')
      .toLowerCase();
  }

  private isProtectedPath(target: string): boolean {
    const segments = target.split('/');

    return protectedPathSegments.some((protectedSegment) => {
      const loweredProtectedSegment = protectedSegment.toLowerCase();

      return (
        target === loweredProtectedSegment ||
        target.startsWith(`${loweredProtectedSegment}/`) ||
        segments.includes(loweredProtectedSegment)
      );
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
