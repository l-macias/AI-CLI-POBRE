import { z } from 'zod';
import { ExecutionEngine } from '../execution/ExecutionEngine.js';
import { RuntimeLoop } from '../loop/RuntimeLoop.js';
import { Logger } from '../observability/Logger.js';
import { RuntimeTracer } from '../observability/RuntimeTracer.js';
import { RuntimeToolController } from '../tools/RuntimeToolController.js';
import { ToolExecutionValidator } from '../tools/ToolExecutionValidator.js';
import { ToolPermissionManager } from '../tools/ToolPermissionManager.js';
import { ToolPermissionPolicy } from '../tools/ToolPermissionPolicy.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { ToolRuntimeExecutor } from '../tools/ToolRuntimeExecutor.js';
import type { AgentRuntime } from '../core/AgentRuntime.js';
import type { AgentRuntimeStateSnapshot } from '../core/RuntimeState.js';
import type { RuntimePlan, RuntimePlanReview } from '../types/PlanningTypes.js';
import type { RuntimeTool, ToolExecutionContext, ToolExecutionResult } from '../types/ToolTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const tracer = new RuntimeTracer();

const logger = new Logger({
  namespace: 'zero-runtime:observability-loop-execution-test',
  level: 'info',
});

const registry = new ToolRegistry();

const controlledToolInputSchema = z.object({
  value: z.string(),
});

const controlledTool: RuntimeTool<typeof controlledToolInputSchema> = {
  name: 'controlled_test_tool',
  description: 'Controlled fake tool for RuntimeLoop + ExecutionEngine observability test.',
  permissions: ['read'],
  inputSchema: controlledToolInputSchema,
  execute: (input: unknown, context: ToolExecutionContext): Promise<ToolExecutionResult> => {
    const parsed = controlledToolInputSchema.parse(input);

    const result: ToolExecutionResult = {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'executed',
      output: {
        value: parsed.value,
      },
      issues: [],
      executedAt: new Date().toISOString(),
      durationMs: 2,
    };

    return Promise.resolve(result);
  },
};

registry.register(controlledTool);

const validator = new ToolExecutionValidator({
  registry,
  permissionPolicy: new ToolPermissionPolicy({
    allowedPermissions: ['read'],
  }),
});

const permissionManager = new ToolPermissionManager({
  allowedPermissions: ['read'],
});

const executor = new ToolRuntimeExecutor({
  validator,
  permissionManager,
  tracer,
});

const controller = new RuntimeToolController({
  executor,
  logger,
  tracer,
});

const executionEngine = new ExecutionEngine({
  controller,
  logger,
  tracer,
});

const plan = {
  id: 'observability-loop-plan-001',
  title: 'Observability loop execution test plan',
  objective: 'Validate RuntimeLoop, ExecutionEngine, timeline and decision logs.',
  summary: 'Runs one controlled tool through the runtime execution path.',
  riskLevel: 'low',
  steps: [
    {
      id: 'step-001',
      title: 'Execute controlled test tool',
      description: 'Executes a safe fake runtime tool.',
      type: 'tool_call',
      target: 'controlled_test_tool',
      rationale: 'Validate observability hooks without external provider.',
      toolIntent: {
        toolName: 'controlled_test_tool',
        input: {
          value: 'safe-observability-test',
          apiKey: 'sk-this-must-not-leak',
        },
      },
    },
  ],
  createdAt: new Date().toISOString(),
} as unknown as RuntimePlan;

const review = {
  plan,
  status: 'ready_for_execution',
  validation: {
    valid: true,
    issues: [],
  },
  approvals: [
    {
      approvedBy: 'runtime',
      approvedAt: new Date().toISOString(),
      reason: 'Controlled test review approval.',
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as RuntimePlanReview;

const snapshot = {
  phase: 'planning',
  initializedAt: new Date().toISOString(),
  activeProvider: 'openrouter',
  activeModel: 'test/free-model',
  contextTokenEstimate: 0,
  loadedContextSources: [],
  activeObjective: null,
  activePlanReview: review,
  lastError: null,
} as unknown as AgentRuntimeStateSnapshot;

const fakeRuntime = {
  acceptObjective(): Promise<void> {
    return Promise.resolve();
  },

  generatePlan(): Promise<RuntimePlan> {
    return Promise.resolve(plan);
  },

  approveActivePlan(): Promise<RuntimePlanReview> {
    return Promise.resolve(review);
  },

  markActivePlanReadyForExecution(): Promise<RuntimePlanReview> {
    return Promise.resolve(review);
  },

  executeActivePlanStepThroughEngine(stepId: string) {
    return executionEngine.executeStep({
      snapshot,
      stepId,
    });
  },

  executeActivePlanSequentially(): Promise<never> {
    return Promise.reject(new Error('Sequential execution is not used in this test.'));
  },
} as unknown as AgentRuntime;

tracer.startSession('session-31-loop-execution-test');

const loop = new RuntimeLoop({
  runtime: fakeRuntime,
  logger,
  tracer,
});

const loopResult = await loop.runOnce({
  objective: {
    objective: 'Validate observability loop execution path.',
    module: 'observability',
  },
  maxSteps: 1,
  autoApprove: true,
  recoveryDepth: 0,
});

tracer.completeSession('session-31-loop-execution-test');

const summary = tracer.summarizeMetrics();
const events = tracer.listEvents();
const timeline = tracer.getTimeline().list();
const decisions = tracer.getDecisionLogViewer().list();
const stepResult = loopResult.state.stepResult;

const serializedObservabilityData = JSON.stringify({
  events,
  timeline,
  decisions,
  summary,
});

assert(loopResult.state.status === 'completed', 'Expected loop to complete.');
assert(typeof stepResult !== 'undefined', 'Expected ExecutionEngine step result.');

if (typeof stepResult === 'undefined') {
  throw new Error('Expected ExecutionEngine step result.');
}

assert(stepResult.step.status === 'executed', 'Expected step to be executed.');
assert(summary.sessions.length === 1, 'Expected one session metric.');
assert(summary.loops.length === 1, 'Expected one loop metric.');
assert(summary.totals.loops === 1, 'Expected one loop total.');
assert(summary.totals.toolExecutions === 1, 'Expected one tool execution.');
assert(summary.totals.blockedActions === 0, 'Expected zero blocked actions.');
assert(summary.totals.failedActions === 0, 'Expected zero failed actions.');
assert(timeline.length === 1, 'Expected one execution timeline entry.');
assert(timeline[0]?.status === 'completed', 'Expected timeline entry to be completed.');

assert(
  decisions.some((entry) => entry.decision === 'gate_allowed'),
  'Expected gate_allowed decision log.',
);

assert(
  decisions.some((entry) => entry.decision === 'mapping_succeeded'),
  'Expected mapping_succeeded decision log.',
);

assert(
  events.some((event) => event.type === 'loop_started'),
  'Expected loop_started trace event.',
);

assert(
  events.some((event) => event.type === 'loop_completed'),
  'Expected loop_completed trace event.',
);

assert(
  events.some((event) => event.type === 'tool_requested'),
  'Expected tool_requested trace event.',
);

assert(
  events.some((event) => event.type === 'tool_executed'),
  'Expected tool_executed trace event.',
);

assert(
  !serializedObservabilityData.includes('sk-this-must-not-leak'),
  'Secret leaked through observability data.',
);

console.log(
  JSON.stringify({
    message: 'Observability runtime loop execution test completed',
    loopStatus: loopResult.state.status,
    summary,
    timeline,
    decisions,
  }),
);
