import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { ControlledNpmScriptRunner } from '../../shell/ControlledNpmScriptRunner.js';
import { npmScriptToolInputSchema } from '../ToolSchemas.js';

export class NpmScriptTool implements RuntimeTool<typeof npmScriptToolInputSchema> {
  public readonly name = 'npm_script';
  public readonly description = 'Execute a controlled npm script through sandbox policy.';
  public readonly permissions = ['execute', 'read'] as const;
  public readonly inputSchema = npmScriptToolInputSchema;

  private readonly runner: ControlledNpmScriptRunner;

  public constructor(
    options: {
      runner?: ControlledNpmScriptRunner | undefined;
    } = {},
  ) {
    this.runner = options.runner ?? new ControlledNpmScriptRunner();
  }

  public async execute(
    input: unknown,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startedAt = new Date(context.startedAt);
    const parsed = this.inputSchema.safeParse(input);

    if (!parsed.success) {
      return this.result(
        context,
        startedAt,
        'failed',
        undefined,
        parsed.error.issues.map((issue) => ({
          code: 'NPM_SCRIPT_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
      );
    }

    return this.runner.run({
      script: parsed.data.script,
      cwd: parsed.data.cwd,
      timeoutMs: parsed.data.timeoutMs,
      maxOutputBytes: parsed.data.maxOutputBytes,
      context,
    });
  }

  private result(
    context: ToolExecutionContext,
    startedAt: Date,
    status: ToolExecutionResult['status'],
    output: unknown,
    issues: ToolExecutionResult['issues'],
  ): ToolExecutionResult {
    const now = new Date();
    const result: ToolExecutionResult = {
      requestId: context.requestId,
      toolName: context.toolName,
      status,
      issues,
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };

    if (output !== undefined) {
      result.output = output;
    }

    return result;
  }
}
