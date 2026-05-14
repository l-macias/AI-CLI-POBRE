import type {
  ToolExecutionRequest,
  ToolExecutionValidationIssue,
  ToolExecutionValidationResult,
} from '../types/ToolTypes.js';
import { ToolPermissionPolicy } from './ToolPermissionPolicy.js';
import type { ToolRegistry } from './ToolRegistry.js';
import { toolExecutionRequestSchema } from './ToolSchemas.js';

export interface ToolExecutionValidatorOptions {
  registry: ToolRegistry;
  permissionPolicy?: ToolPermissionPolicy | undefined;
}

export class ToolExecutionValidator {
  private readonly registry: ToolRegistry;
  private readonly permissionPolicy: ToolPermissionPolicy;

  public constructor(options: ToolExecutionValidatorOptions) {
    this.registry = options.registry;
    this.permissionPolicy = options.permissionPolicy ?? new ToolPermissionPolicy();
  }

  public validate(request: ToolExecutionRequest): ToolExecutionValidationResult {
    const validatedAt = new Date().toISOString();
    const issues: ToolExecutionValidationIssue[] = [];

    const requestValidation = toolExecutionRequestSchema.safeParse(request);

    if (!requestValidation.success) {
      return {
        valid: false,
        status: 'rejected',
        issues: requestValidation.error.issues.map((issue) => ({
          code: 'TOOL_REQUEST_SCHEMA_INVALID',
          message: `${issue.path.join('.') || 'request'}: ${issue.message}`,
          severity: 'error',
        })),
        request,
        validatedAt,
      };
    }

    if (!this.registry.has(request.toolName)) {
      return {
        valid: false,
        status: 'rejected',
        issues: [
          {
            code: 'TOOL_NOT_REGISTERED',
            message: `Tool "${request.toolName}" is not registered.`,
            severity: 'error',
          },
        ],
        request,
        validatedAt,
      };
    }

    const tool = this.registry.get(request.toolName);

    issues.push(...this.permissionPolicy.validate(tool));

    const inputValidation = tool.inputSchema.safeParse(request.input);

    if (!inputValidation.success) {
      issues.push(
        ...inputValidation.error.issues.map((issue) => ({
          code: 'TOOL_INPUT_SCHEMA_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error' as const,
        })),
      );
    }

    const valid = issues.every((issue) => issue.severity !== 'error');

    if (!valid) {
      return {
        valid: false,
        status: 'rejected',
        issues,
        request,
        tool,
        validatedAt,
      };
    }

    return {
      valid: true,
      status: 'validated',
      issues,
      request,
      tool,
      validatedInput: inputValidation.data,
      validatedAt,
    };
  }
}
