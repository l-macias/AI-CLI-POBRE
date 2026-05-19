import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { ControlledNpmScriptRunner } from '../../shell/ControlledNpmScriptRunner.js';
import { fixedNpmScriptToolInputSchema } from '../ToolSchemas.js';

export class BuildCommandTool implements RuntimeTool<typeof fixedNpmScriptToolInputSchema> {
  public readonly name = 'build_command';
  public readonly description = 'Execute the controlled build command through sandbox policy.';
  public readonly permissions = ['execute', 'read'] as const;
  public readonly inputSchema = fixedNpmScriptToolInputSchema;

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
          code: 'BUILD_COMMAND_INPUT_INVALID',
          message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
          severity: 'error',
        })),
      );
    }

    return this.runner.run({
      script: 'build',
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

    return {
      requestId: context.requestId,
      toolName: context.toolName,
      status,
      output,
      issues,
      executedAt: now.toISOString(),
      durationMs: now.getTime() - startedAt.getTime(),
    };
  }
}
