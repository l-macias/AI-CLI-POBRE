import path from 'node:path';
import type {
  FileIsolationResult,
  SandboxCommandRequest,
  SandboxPolicyIssue,
} from '../types/SandboxTypes.js';

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

export class FileIsolation {
  public check(request: SandboxCommandRequest): FileIsolationResult {
    const issues: SandboxPolicyIssue[] = [];
    const normalizedCwd = this.normalizePath(request.cwd);

    if (path.isAbsolute(request.cwd)) {
      issues.push({
        code: 'SANDBOX_ABSOLUTE_CWD_BLOCKED',
        message: `Absolute cwd is not allowed by sandbox policy: ${request.cwd}`,
        severity: 'error',
      });
    }

    if (this.isProtectedPath(normalizedCwd)) {
      issues.push({
        code: 'SANDBOX_PROTECTED_CWD_BLOCKED',
        message: `Protected cwd is not allowed by sandbox policy: ${request.cwd}`,
        severity: 'error',
      });
    }

    for (const pathArg of request.pathArgs ?? []) {
      const normalizedPathArg = this.normalizePath(pathArg);

      if (this.isProtectedPath(normalizedPathArg)) {
        issues.push({
          code: 'SANDBOX_PROTECTED_ARG_PATH_BLOCKED',
          message: `Command path argument references protected path: ${pathArg}`,
          severity: 'error',
        });
      }
    }

    return {
      allowed: issues.every((issue) => issue.severity !== 'error'),
      issues,
    };
  }

  private normalizePath(value: string): string {
    return value
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '')
      .toLowerCase();
  }

  private isProtectedPath(value: string): boolean {
    const segments = value.split('/');

    return protectedPathSegments.some((segment) => {
      const normalizedSegment = segment.toLowerCase();

      return (
        value === normalizedSegment ||
        value.startsWith(`${normalizedSegment}/`) ||
        segments.includes(normalizedSegment)
      );
    });
  }
}
