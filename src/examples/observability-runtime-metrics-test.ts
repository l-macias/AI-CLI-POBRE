import { RuntimeTracer } from '../observability/RuntimeTracer.js';
import { SensitiveDataRedactor } from '../observability/SensitiveDataRedactor.js';
import type { RuntimeModelUsageMetric } from '../types/ObservabilityTypes.js';
import type { ToolExecutionResult } from '../types/ToolTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const redactor = new SensitiveDataRedactor();
const tracer = new RuntimeTracer({
  redactor,
});

tracer.startSession('session-31-test');
tracer.startLoop('loop-31-test');

const timeline = tracer.getTimeline();
const timelineEntry = timeline.start({
  label: 'Execute controlled tool',
  source: 'observability-runtime-metrics-test',
  metadata: {
    safe: true,
    apiKey: 'sk-this-must-not-leak',
    nested: {
      OPENROUTER_API_KEY: 'secret-value',
    },
  },
});

timeline.complete({
  id: timelineEntry.id,
  status: 'completed',
});

const modelUsage: RuntimeModelUsageMetric = {
  provider: 'openrouter',
  model: 'test/free-model',
  role: 'planner',
  tier: 'free',
  promptTokens: 120,
  completionTokens: 80,
  totalTokens: 200,
  estimatedUsd: 0,
  reason: 'Session 31 isolated metrics test',
  recordedAt: new Date().toISOString(),
};

tracer.recordModelUsage(modelUsage);

const executedTool: ToolExecutionResult = {
  requestId: 'tool-request-31-001',
  toolName: 'read_file',
  status: 'executed',
  output: {
    ok: true,
  },
  issues: [],
  executedAt: new Date().toISOString(),
  durationMs: 12,
};

tracer.recordToolResult(executedTool);

const blockedTool: ToolExecutionResult = {
  requestId: 'tool-request-31-002',
  toolName: 'edit_file',
  status: 'not_executed',
  issues: [
    {
      code: 'DIFF_CONFIRMATION_REQUIRED',
      message: 'diffConfirmed must be true.',
      severity: 'error',
    },
  ],
  executedAt: new Date().toISOString(),
  durationMs: 3,
};

tracer.recordToolResult(blockedTool);

const profiler = tracer.getPerformanceProfiler();

await profiler.measure(
  {
    operation: 'fake async operation',
    source: 'observability-runtime-metrics-test',
    metadata: {
      token: 'Bearer should-not-leak',
    },
  },
  async () => {
    await Promise.resolve();
  },
);

const errors = tracer.getErrorReporter();

errors.report({
  source: 'observability-runtime-metrics-test',
  code: 'EXPECTED_TEST_ERROR',
  error: new Error('Failure with API_KEY=super-secret'),
  metadata: {
    password: '123456',
  },
});

const decisions = tracer.getDecisionLogViewer();

decisions.record({
  source: 'observability-runtime-metrics-test',
  decision: 'blocked_unconfirmed_edit',
  reason: 'Runtime requires explicit confirmation before write.',
  metadata: {
    secret: 'must-not-leak',
  },
});

tracer.completeLoop({
  loopId: 'loop-31-test',
  status: 'completed',
  executedSteps: 1,
  blockedSteps: 1,
  failedSteps: 0,
  recoveryCount: 0,
});

tracer.completeSession('session-31-test');

const summary = tracer.summarizeMetrics();
const serializedEvents = JSON.stringify(tracer.listEvents());
const serializedTimeline = JSON.stringify(timeline.list());
const serializedErrors = JSON.stringify(errors.list());
const serializedDecisions = JSON.stringify(decisions.list());
const serializedProfiles = JSON.stringify(profiler.list());

assert(summary.sessions.length === 1, 'Expected one session metric.');
assert(summary.loops.length === 1, 'Expected one loop metric.');
assert(summary.totals.events >= 7, 'Expected trace events to be recorded.');
assert(summary.totals.toolExecutions === 2, 'Expected two tool metrics.');
assert(summary.totals.blockedActions === 1, 'Expected one blocked action.');
assert(summary.totals.failedActions === 0, 'Expected zero failed actions.');
assert(summary.totals.totalTokens === 200, 'Expected model token usage to be recorded.');
assert(summary.totals.estimatedUsd === 0, 'Expected zero estimated USD for test model.');
assert(timeline.list().length === 1, 'Expected one timeline entry.');
assert(profiler.list().length === 1, 'Expected one performance profile.');
assert(errors.list().length === 1, 'Expected one error report.');
assert(decisions.list().length === 1, 'Expected one decision log entry.');

const combinedSerialized = [
  serializedEvents,
  serializedTimeline,
  serializedErrors,
  serializedDecisions,
  serializedProfiles,
].join('\n');

assert(
  !combinedSerialized.includes('sk-this-must-not-leak'),
  'API key leaked in observability data.',
);
assert(!combinedSerialized.includes('secret-value'), 'OPENROUTER_API_KEY value leaked.');
assert(!combinedSerialized.includes('super-secret'), 'Inline API_KEY value leaked.');
assert(!combinedSerialized.includes('123456'), 'Password leaked.');
assert(!combinedSerialized.includes('must-not-leak'), 'Secret metadata leaked.');
assert(!combinedSerialized.includes('Bearer should-not-leak'), 'Bearer token leaked.');
assert(
  combinedSerialized.includes('"promptTokens":120'),
  'Safe prompt token metric was incorrectly redacted.',
);

assert(
  combinedSerialized.includes('"completionTokens":80'),
  'Safe completion token metric was incorrectly redacted.',
);

assert(
  combinedSerialized.includes('"totalTokens":200'),
  'Safe total token metric was incorrectly redacted.',
);
console.log(
  JSON.stringify({
    message: 'Observability runtime metrics test completed',
    summary,
  }),
);
