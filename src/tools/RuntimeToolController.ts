import type { AgentRuntimeStateSnapshot } from '../core/RuntimeState.js';
import type { Logger } from '../observability/Logger.js';
import type { ToolExecutionResult, ToolExecutionValidationIssue } from '../types/ToolTypes.js';
import { PlanStepToolMapper } from './PlanStepToolMapper.js';
import { RuntimeToolExecutionGate } from './RuntimeToolExecutionGate.js';
import type { ToolRuntimeExecutor } from './ToolRuntimeExecutor.js';

export interface RuntimeToolControllerOptions {
  executor: ToolRuntimeExecutor;
  logger: Logger;
  gate?: RuntimeToolExecutionGate | undefined;
  mapper?: PlanStepToolMapper | undefined;
}

export interface RuntimeToolControllerExecuteStepInput {
  snapshot: AgentRuntimeStateSnapshot;
  stepId: string;
}

export class RuntimeToolController {
  private readonly executor: ToolRuntimeExecutor;
  private readonly logger: Logger;
  private readonly gate: RuntimeToolExecutionGate;
  private readonly mapper: PlanStepToolMapper;

  public constructor(options: RuntimeToolControllerOptions) {
    this.executor = options.executor;
    this.logger = options.logger;
    this.gate = options.gate ?? new RuntimeToolExecutionGate();
    this.mapper = options.mapper ?? new PlanStepToolMapper();
  }

  public async executeStep(
    input: RuntimeToolControllerExecuteStepInput,
  ): Promise<ToolExecutionResult> {
    const startedAt = new Date();

    const gateResult = this.gate.canExecuteStep({
      snapshot: input.snapshot,
      stepId: input.stepId,
    });

    if (!gateResult.allowed || !gateResult.review || !gateResult.step) {
      const result = this.createNotExecutedResult({
        requestId: `runtime-tool-gate-${input.stepId}`,
        toolName: gateResult.step?.toolIntent?.toolName ?? 'runtime_tool_gate',
        startedAt,
        issues: gateResult.issues,
      });

      this.audit('gate_blocked', input.stepId, result);

      return result;
    }

    const mapping = this.mapper.map({
      planId: gateResult.review.plan.id,
      step: gateResult.step,
    });

    if (!mapping.mapped || !mapping.request) {
      const result = this.createNotExecutedResult({
        requestId: `runtime-tool-mapper-${input.stepId}`,
        toolName: gateResult.step.toolIntent?.toolName ?? 'runtime_tool_mapper',
        startedAt,
        issues: mapping.issues,
      });

      this.audit('mapping_failed', input.stepId, result);

      return result;
    }

    const result = await this.executor.execute(mapping.request);

    this.audit('tool_execution_completed', input.stepId, result);

    return result;
  }

  private createNotExecutedResult(input: {
    requestId: string;
    toolName: string;
    startedAt: Date;
    issues: ToolExecutionValidationIssue[];
  }): ToolExecutionResult {
    const finishedAt = new Date();

    return {
      requestId: input.requestId,
      toolName: input.toolName,
      status: 'not_executed',
      issues: input.issues,
      executedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - input.startedAt.getTime(),
    };
  }

  private audit(stage: string, stepId: string, result: ToolExecutionResult): void {
    this.logger.info('Runtime tool execution audit', {
      stage,
      stepId,
      requestId: result.requestId,
      toolName: result.toolName,
      status: result.status,
      issues: result.issues,
      executedAt: result.executedAt,
      durationMs: result.durationMs,
    });
  }
}
