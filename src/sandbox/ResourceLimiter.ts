import type {
  AllowedCommandDefinition,
  ResourceLimitResult,
  SandboxCommandRequest,
  SandboxPolicyIssue,
} from '../types/SandboxTypes.js';

export class ResourceLimiter {
  public check(input: {
    request: SandboxCommandRequest;
    definition: AllowedCommandDefinition | null;
  }): ResourceLimitResult {
    const timeoutMs = input.request.timeoutMs ?? input.definition?.defaultTimeoutMs ?? 30_000;
    const maxOutputBytes =
      input.request.maxOutputBytes ?? input.definition?.defaultMaxOutputBytes ?? 100_000;

    const issues: SandboxPolicyIssue[] = [];

    if (timeoutMs <= 0 || timeoutMs > 300_000) {
      issues.push({
        code: 'SANDBOX_TIMEOUT_LIMIT_EXCEEDED',
        message: `timeoutMs ${String(timeoutMs)} is outside allowed range.`,
        severity: 'error',
      });
    }

    if (maxOutputBytes <= 0 || maxOutputBytes > 1_000_000) {
      issues.push({
        code: 'SANDBOX_OUTPUT_LIMIT_EXCEEDED',
        message: `maxOutputBytes ${String(maxOutputBytes)} is outside allowed range.`,
        severity: 'error',
      });
    }

    return {
      allowed: issues.every((issue) => issue.severity !== 'error'),
      timeoutMs,
      maxOutputBytes,
      issues,
    };
  }
}
