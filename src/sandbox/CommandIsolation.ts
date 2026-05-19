import type {
  AllowedCommandDefinition,
  CommandIsolationResult,
  SandboxCommandRequest,
  SandboxPolicyIssue,
} from '../types/SandboxTypes.js';

export class CommandIsolation {
  public check(input: {
    request: SandboxCommandRequest;
    definition: AllowedCommandDefinition | null;
  }): CommandIsolationResult {
    const issues: SandboxPolicyIssue[] = [];

    if (!input.definition) {
      return {
        allowed: false,
        issues: [
          {
            code: 'SANDBOX_COMMAND_NOT_REGISTERED',
            message: `Command "${input.request.command}" is not registered as allowed.`,
            severity: 'error',
          },
        ],
      };
    }

    const argsKey = input.request.args.join(' ');

    if (!input.definition.allowedArgs.includes(argsKey)) {
      issues.push({
        code: 'SANDBOX_COMMAND_ARGS_NOT_ALLOWED',
        message: `Arguments "${argsKey}" are not allowed for "${input.request.command}".`,
        severity: 'error',
      });
    }

    if (input.request.networkAccess === true && !input.definition.allowNetwork) {
      issues.push({
        code: 'SANDBOX_NETWORK_BLOCKED',
        message: `Network access is not allowed for "${input.request.command}".`,
        severity: 'error',
      });
    }

    if (!this.isCwdAllowed(input.request.cwd, input.definition.allowedCwdPrefixes)) {
      issues.push({
        code: 'SANDBOX_CWD_NOT_ALLOWED',
        message: `cwd "${input.request.cwd}" is not allowed for "${input.request.command}".`,
        severity: 'error',
      });
    }

    return {
      allowed: issues.every((issue) => issue.severity !== 'error'),
      issues,
    };
  }

  private isCwdAllowed(cwd: string, allowedPrefixes: readonly string[]): boolean {
    const normalizedCwd = this.normalize(cwd);

    return allowedPrefixes.some((prefix) => {
      const normalizedPrefix = this.normalize(prefix);

      return normalizedCwd === normalizedPrefix || normalizedCwd.startsWith(`${normalizedPrefix}/`);
    });
  }

  private normalize(value: string): string {
    return (
      value
        .trim()
        .replaceAll('\\', '/')
        .replace(/^\.\/+/, '') || '.'
    );
  }
}
