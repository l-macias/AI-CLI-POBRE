import type {
  ToolDefinition,
  ToolExecutionValidationIssue,
  ToolPermission,
} from '../types/ToolTypes.js';

export interface ToolPermissionPolicyOptions {
  allowedPermissions?: readonly ToolPermission[] | undefined;
}

export class ToolPermissionPolicy {
  private readonly allowedPermissions: Set<ToolPermission>;

  public constructor(options: ToolPermissionPolicyOptions = {}) {
    this.allowedPermissions = new Set(options.allowedPermissions ?? ['read']);
  }

  public validate(tool: ToolDefinition): ToolExecutionValidationIssue[] {
    const issues: ToolExecutionValidationIssue[] = [];

    for (const permission of tool.permissions) {
      if (!this.allowedPermissions.has(permission)) {
        issues.push({
          code: 'TOOL_PERMISSION_DENIED',
          message: `Tool "${tool.name}" requires denied permission "${permission}".`,
          severity: 'error',
        });
      }
    }

    return issues;
  }
}
