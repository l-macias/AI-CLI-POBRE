import type {
  GuardrailInput,
  GuardrailIssue,
  GuardrailResult,
  RuntimeGuardrail,
} from '../types/GuardrailTypes.js';

const dangerousCommandPatterns = [
  /\brm\s+-rf\b/i,
  /\bdel\s+\/s\b/i,
  /\bformat\b/i,
  /\bdrop\s+database\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bmkfs\b/i,
  /\bchmod\s+777\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+clean\s+-fd\b/i,
];

export class DangerousCommandGuard implements RuntimeGuardrail {
  public readonly kind = 'dangerous_command' as const;

  public validate(input: GuardrailInput): GuardrailResult {
    const issues: GuardrailIssue[] = [];
    const command = this.extractCommand(input.request.input);

    if (!command) {
      return {
        guardrail: this.kind,
        status: 'passed',
        issues,
      };
    }

    if (this.isDangerousCommand(command)) {
      issues.push({
        code: 'DANGEROUS_COMMAND_BLOCKED',
        message: `Dangerous command blocked: ${command}`,
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

  private extractCommand(input: unknown): string | null {
    if (!this.isRecord(input)) {
      return null;
    }

    const command = input['command'];

    if (typeof command !== 'string') {
      return null;
    }

    return command;
  }

  private isDangerousCommand(command: string): boolean {
    return dangerousCommandPatterns.some((pattern) => pattern.test(command));
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
