import type {
  RuntimeTool,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../types/ToolTypes.js';
import { ShellExecutionGate } from '../../shell/ShellExecutionGate.js';
import { dryRunCommandToolInputSchema } from '../ToolSchemas.js';

export class DryRunCommandTool implements RuntimeTool<typeof dryRunCommandToolInputSchema> {
  public readonly name = 'dry_run_command';
  public readonly description = 'Evaluate a command against sandbox policy without executing it.';
  public readonly permissions = ['read'] as const;
  public readonly inputSchema = dryRunCommandToolInputSchema;

  private readonly gate: ShellExecutionGate;

  public constructor(options: { gate?: ShellExecutionGate | undefined } = {}) {
    this.gate = options.gate ?? new ShellExecutionGate();
  }

  public execute(input: unknown, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startedAt = new Date(context.startedAt);
    const parsed = this.inputSchema.safeParse(input);

    if (!parsed.success) {
      return Promise.resolve(
        this.result(
          context,
          startedAt,
          'failed',
          undefined,
          parsed.error.issues.map((issue) => ({
            code: 'DRY_RUN_COMMAND_INPUT_INVALID',
            message: `${issue.path.join('.') || 'input'}: ${issue.message}`,
            severity: 'error',
          })),
        ),
      );
    }

    const decision = this.gate.evaluate({
      command: parsed.data.command,
      args: parsed.data.args,
      cwd: parsed.data.cwd,
      pathArgs: parsed.data.pathArgs,
      timeoutMs: parsed.data.timeoutMs,
      maxOutputBytes: parsed.data.maxOutputBytes,
      networkAccess: parsed.data.networkAccess,
    });

    return Promise.resolve(this.result(context, startedAt, 'executed', decision, []));
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
