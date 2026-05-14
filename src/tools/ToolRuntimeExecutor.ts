import type {
  RuntimeTool,
  ToolDefinition,
  ToolExecutionRequest,
  ToolExecutionResult,
  ToolExecutionValidationIssue,
} from '../types/ToolTypes.js';
import type { ToolPermissionManager } from './ToolPermissionManager.js';
import type { ToolExecutionValidator } from './ToolExecutionValidator.js';

export interface ToolRuntimeExecutorOptions {
  validator: ToolExecutionValidator;
  permissionManager: ToolPermissionManager;
}

export class ToolRuntimeExecutor {
  private readonly validator: ToolExecutionValidator;
  private readonly permissionManager: ToolPermissionManager;

  public constructor(options: ToolRuntimeExecutorOptions) {
    this.validator = options.validator;
    this.permissionManager = options.permissionManager;
  }

  public async execute(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const startedAt = new Date();
    const validation = this.validator.validate(request);

    if (!validation.valid || !validation.tool) {
      return this.createNotExecutedResult({
        request,
        startedAt,
        issues: validation.issues,
      });
    }

    if (!this.isRuntimeTool(validation.tool)) {
      return this.createNotExecutedResult({
        request,
        startedAt,
        issues: [
          {
            code: 'TOOL_NOT_EXECUTABLE',
            message: `Tool "${request.toolName}" is registered but does not expose execute().`,
            severity: 'error',
          },
        ],
      });
    }

    const permissionCheck = this.permissionManager.check({
      request,
      requiredPermissions: validation.tool.permissions,
    });

    if (!permissionCheck.allowed) {
      return this.createNotExecutedResult({
        request,
        startedAt,
        issues: permissionCheck.issues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          severity: issue.severity,
        })),
      });
    }

    try {
      return await validation.tool.execute(validation.validatedInput, {
        requestId: request.id,
        toolName: request.toolName,
        startedAt: startedAt.toISOString(),
      });
    } catch (error) {
      const finishedAt = new Date();

      return {
        requestId: request.id,
        toolName: request.toolName,
        status: 'failed',
        issues: [
          {
            code: 'TOOL_EXECUTION_FAILED',
            message: error instanceof Error ? error.message : String(error),
            severity: 'error',
          },
        ],
        executedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      };
    }
  }

  private createNotExecutedResult(input: {
    request: ToolExecutionRequest;
    startedAt: Date;
    issues: ToolExecutionValidationIssue[];
  }): ToolExecutionResult {
    const finishedAt = new Date();

    return {
      requestId: input.request.id,
      toolName: input.request.toolName,
      status: 'not_executed',
      issues: input.issues,
      executedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - input.startedAt.getTime(),
    };
  }

  private isRuntimeTool(tool: ToolDefinition): tool is RuntimeTool {
    const candidate = tool as ToolDefinition & { execute?: unknown };

    return typeof candidate.execute === 'function';
  }
}
