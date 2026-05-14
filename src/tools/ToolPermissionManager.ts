import { ContextOverflowGuard } from '../guardrails/ContextOverflowGuard.js';
import { DangerousCommandGuard } from '../guardrails/DangerousCommandGuard.js';
import { PermissionGuard } from '../guardrails/PermissionGuard.js';
import { ProtectedFilesGuard } from '../guardrails/ProtectedFilesGuard.js';
import { TokenLimitGuard } from '../guardrails/TokenLimitGuard.js';
import type {
  GuardrailInput,
  RuntimeGuardrail,
  ToolPermissionManagerResult,
} from '../types/GuardrailTypes.js';
import type { ToolExecutionRequest, ToolPermission } from '../types/ToolTypes.js';

export interface ToolPermissionManagerOptions {
  allowedPermissions?: readonly ToolPermission[] | undefined;
  guardrails?: readonly RuntimeGuardrail[] | undefined;
}

export interface ToolPermissionCheckInput {
  request: ToolExecutionRequest;
  requiredPermissions: readonly ToolPermission[];
  estimatedTokens?: number | undefined;
  maxTokens?: number | undefined;
  estimatedContextTokens?: number | undefined;
  maxContextTokens?: number | undefined;
}

export class ToolPermissionManager {
  private readonly guardrails: readonly RuntimeGuardrail[];

  public constructor(options: ToolPermissionManagerOptions = {}) {
    this.guardrails = options.guardrails ?? [
      new PermissionGuard({
        allowedPermissions: options.allowedPermissions
          ? [...options.allowedPermissions]
          : undefined,
      }),
      new ProtectedFilesGuard(),
      new DangerousCommandGuard(),
      new TokenLimitGuard(),
      new ContextOverflowGuard(),
    ];
  }

  public check(input: ToolPermissionCheckInput): ToolPermissionManagerResult {
    const guardrailInput = this.createGuardrailInput(input);
    const results = this.guardrails.map((guardrail) => guardrail.validate(guardrailInput));
    const issues = results.flatMap((result) => result.issues);
    const allowed = issues.every((issue) => issue.severity !== 'error');

    return {
      allowed,
      status: allowed ? 'passed' : 'blocked',
      issues,
      results,
      checkedAt: new Date().toISOString(),
    };
  }

  private createGuardrailInput(input: ToolPermissionCheckInput): GuardrailInput {
    const guardrailInput: GuardrailInput = {
      request: input.request,
      requiredPermissions: input.requiredPermissions,
    };

    if (input.estimatedTokens !== undefined) {
      guardrailInput.estimatedTokens = input.estimatedTokens;
    }

    if (input.maxTokens !== undefined) {
      guardrailInput.maxTokens = input.maxTokens;
    }

    if (input.estimatedContextTokens !== undefined) {
      guardrailInput.estimatedContextTokens = input.estimatedContextTokens;
    }

    if (input.maxContextTokens !== undefined) {
      guardrailInput.maxContextTokens = input.maxContextTokens;
    }

    return guardrailInput;
  }
}
