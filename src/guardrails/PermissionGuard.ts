import type {
  GuardrailInput,
  GuardrailIssue,
  GuardrailResult,
  RuntimeGuardrail,
} from '../types/GuardrailTypes.js';
import type { ToolPermission } from '../types/ToolTypes.js';

export interface PermissionGuardOptions {
  allowedPermissions?: ToolPermission[] | undefined;
}

export class PermissionGuard implements RuntimeGuardrail {
  public readonly kind = 'permission' as const;

  private readonly allowedPermissions: Set<ToolPermission>;

  public constructor(options: PermissionGuardOptions = {}) {
    this.allowedPermissions = new Set(options.allowedPermissions ?? ['read']);
  }

  public validate(input: GuardrailInput): GuardrailResult {
    const issues: GuardrailIssue[] = [];

    for (const permission of input.requiredPermissions) {
      if (!this.allowedPermissions.has(permission)) {
        issues.push({
          code: 'PERMISSION_DENIED',
          message: `Permission "${permission}" is not allowed for request "${input.request.id}".`,
          severity: 'error',
          guardrail: this.kind,
        });
      }
    }

    return {
      guardrail: this.kind,
      status: issues.length === 0 ? 'passed' : 'blocked',
      issues,
    };
  }
}
