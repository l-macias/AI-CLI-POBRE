import { ShellCommandExecutor } from './ShellCommandExecutor.js';
import { ShellCommandPlanner } from './ShellCommandPlanner.js';
import { ShellExecutionGate } from './ShellExecutionGate.js';
import type { ToolExecutionContext, ToolExecutionResult } from '../types/ToolTypes.js';

export type ControlledNpmScript = 'typecheck' | 'lint' | 'build' | 'test';

export interface ControlledNpmScriptRunnerOptions {
  gate?: ShellExecutionGate | undefined;
  executor?: ShellCommandExecutor | undefined;
  planner?: ShellCommandPlanner | undefined;
}

export class ControlledNpmScriptRunner {
  private readonly gate: ShellExecutionGate;
  private readonly executor: ShellCommandExecutor;
  private readonly planner: ShellCommandPlanner;

  public constructor(options: ControlledNpmScriptRunnerOptions = {}) {
    this.gate = options.gate ?? new ShellExecutionGate();
    this.executor = options.executor ?? new ShellCommandExecutor();
    this.planner = options.planner ?? new ShellCommandPlanner();
  }

  public async run(input: {
    script: ControlledNpmScript;
    cwd: string;
    timeoutMs?: number | undefined;
    maxOutputBytes?: number | undefined;
    context: ToolExecutionContext;
  }): Promise<ToolExecutionResult> {
    const startedAt = new Date(input.context.startedAt);

    const commandRequest = this.planner.npmScript({
      script: input.script,
      cwd: input.cwd,
      timeoutMs: input.timeoutMs,
      maxOutputBytes: input.maxOutputBytes,
    });

    const decision = this.gate.evaluate(commandRequest);

    if (decision.status !== 'allowed') {
      return this.result(
        input.context,
        startedAt,
        'not_executed',
        {
          sandboxDecision: decision,
        },
        decision.issues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          severity: issue.severity,
        })),
      );
    }

    const execution = await this.executor.execute({
      request: commandRequest,
      timeoutMs: decision.timeoutMs,
      maxOutputBytes: decision.maxOutputBytes,
    });

    return this.result(
      input.context,
      startedAt,
      execution.exitCode === 0 ? 'executed' : 'failed',
      {
        sandboxDecision: decision,
        execution,
      },
      execution.exitCode === 0
        ? []
        : [
            {
              code: 'NPM_SCRIPT_EXIT_NON_ZERO',
              message: `npm script exited with code ${String(execution.exitCode)}.`,
              severity: 'error',
            },
          ],
    );
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
