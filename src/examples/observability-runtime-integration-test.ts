import { z } from 'zod';
import { RuntimeTracer } from '../observability/RuntimeTracer.js';
import { ProviderUsageLedger } from '../providers/ProviderUsageLedger.js';
import { ToolExecutionValidator } from '../tools/ToolExecutionValidator.js';
import { ToolPermissionManager } from '../tools/ToolPermissionManager.js';
import { ToolPermissionPolicy } from '../tools/ToolPermissionPolicy.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { ToolRuntimeExecutor } from '../tools/ToolRuntimeExecutor.js';
import type { ProviderSelectionResult } from '../types/ProviderStrategyTypes.js';
import type { RuntimeTool, ToolExecutionContext, ToolExecutionResult } from '../types/ToolTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const tracer = new RuntimeTracer();

tracer.startSession('session-31-integration-test');

const registry = new ToolRegistry();

const echoToolInputSchema = z.object({
  value: z.string(),
});

const echoTool: RuntimeTool<typeof echoToolInputSchema> = {
  name: 'echo_tool',
  description: 'Echoes safe input for observability integration test.',
  permissions: ['read'],
  inputSchema: echoToolInputSchema,
  execute: (input: unknown, context: ToolExecutionContext): Promise<ToolExecutionResult> => {
    const parsed = echoToolInputSchema.parse(input);

    const result: ToolExecutionResult = {
      requestId: context.requestId,
      toolName: context.toolName,
      status: 'executed',
      output: {
        value: parsed.value,
      },
      issues: [],
      executedAt: new Date().toISOString(),
      durationMs: 1,
    };

    return Promise.resolve(result);
  },
};

registry.register(echoTool);

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

await executor.execute({
  id: 'integration-tool-request-001',
  toolName: 'echo_tool',
  input: {
    value: 'hello',
  },
  proposedBy: 'runtime',
  requestedAt: new Date().toISOString(),
});

await executor.execute({
  id: 'integration-tool-request-002',
  toolName: 'missing_tool',
  input: {
    apiKey: 'sk-this-must-not-leak',
  },
  proposedBy: 'model',
  requestedAt: new Date().toISOString(),
});

const ledger = new ProviderUsageLedger({
  tracer,
});

const selection: ProviderSelectionResult = {
  role: 'planner',
  provider: 'openrouter',
  model: 'test/free-model',
  tier: 'free',
  fallbackModels: [],
  reason: 'Integration test provider selection.',
  premiumSelected: false,
  riskLevel: 'low',
  selectedAt: new Date().toISOString(),
};

ledger.record({
  selection,
  usage: {
    promptTokens: 50,
    completionTokens: 25,
    totalTokens: 75,
  },
  reason: 'Integration test model usage.',
});

tracer.completeSession('session-31-integration-test');

const summary = tracer.summarizeMetrics();
const serialized = JSON.stringify({
  events: tracer.listEvents(),
  summary,
  ledger: ledger.summarize(),
});

assert(summary.sessions.length === 1, 'Expected one session.');
assert(summary.totals.toolExecutions === 2, 'Expected two tool execution metrics.');
assert(summary.totals.blockedActions === 1, 'Expected one blocked tool action.');
assert(summary.totals.failedActions === 0, 'Expected zero failed tool actions.');
assert(summary.totals.promptTokens === 50, 'Expected provider prompt tokens.');
assert(summary.totals.completionTokens === 25, 'Expected provider completion tokens.');
assert(summary.totals.totalTokens === 75, 'Expected provider total tokens.');
assert(!serialized.includes('sk-this-must-not-leak'), 'Secret leaked through integration tracing.');

console.log(
  JSON.stringify({
    message: 'Observability runtime integration test completed',
    summary,
  }),
);
