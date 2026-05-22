export type VerifyCommandApprovalState = 'missing' | 'approved';

export interface VerifyCommandRequest {
  command: string;
  args: string[];
  cwd: string;
  approvalState: VerifyCommandApprovalState;
}

export interface VerifyCommandPolicyIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface VerifyCommandPolicyResult {
  allowed: boolean;
  normalizedCommand: string;
  issues: VerifyCommandPolicyIssue[];
}

export class VerifyCommandPolicy {
  private readonly allowedCommands = new Set<string>([
    'npm run build',
    'npm run lint',
    'npm run typecheck',
    'tsc --noEmit',
  ]);

  public evaluate(request: VerifyCommandRequest): VerifyCommandPolicyResult {
    const normalizedCommand = this.normalizeCommand(request.command, request.args);
    const issues: VerifyCommandPolicyIssue[] = [];

    if (request.approvalState !== 'approved') {
      issues.push({
        code: 'VERIFY_COMMAND_APPROVAL_REQUIRED',
        message: 'Verify commands require explicit user approval before execution.',
        severity: 'error',
      });
    }

    if (!this.allowedCommands.has(normalizedCommand)) {
      issues.push({
        code: 'VERIFY_COMMAND_NOT_ALLOWED',
        message: `Verify command is not allowed: ${normalizedCommand}`,
        severity: 'error',
      });
    }

    if (this.containsDangerousToken(normalizedCommand)) {
      issues.push({
        code: 'VERIFY_COMMAND_DANGEROUS_TOKEN',
        message: `Verify command contains a dangerous token: ${normalizedCommand}`,
        severity: 'error',
      });
    }

    if (request.cwd.trim().length === 0) {
      issues.push({
        code: 'VERIFY_COMMAND_CWD_REQUIRED',
        message: 'Verify command requires a working directory.',
        severity: 'error',
      });
    }

    return {
      allowed: !issues.some((issue) => issue.severity === 'error'),
      normalizedCommand,
      issues,
    };
  }

  public normalizeCommand(command: string, args: string[]): string {
    return [command.trim(), ...args.map((arg) => arg.trim()).filter((arg) => arg.length > 0)]
      .join(' ')
      .replaceAll(/\s+/g, ' ')
      .trim();
  }

  private containsDangerousToken(command: string): boolean {
    const dangerousPatterns = [
      /&&/,
      /\|\|/,
      /;/,
      /\|/,
      />/,
      /</,
      /\brm\b/,
      /\bdel\b/,
      /\brmdir\b/,
      /\bformat\b/,
      /\bpowershell\b/i,
      /\bcurl\b/i,
      /\bwget\b/i,
      /\bssh\b/i,
      /\bscp\b/i,
      /\bnode\b.*-e\b/i,
      /\btsx\b/i,
    ];

    return dangerousPatterns.some((pattern) => pattern.test(command));
  }
}
