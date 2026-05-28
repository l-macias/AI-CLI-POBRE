import { SessionReportBuilder } from '../reports/SessionReportBuilder.js';
import { MarkdownReportExporter } from '../reports/MarkdownReportExporter.js';
import type { InteractiveSessionState } from '../interactive/InteractiveSessionTypes.js';
import type { PatchSandboxResult } from '../sandbox/SandboxResult.js';
import type { PatchRecoveryLoopResult } from '../patches/PatchRecoveryLoop.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const session: InteractiveSessionState = {
  id: 'session-report-sandbox-recovery-test',
  projectRoot: '/tmp/project',
  projectName: 'project',
  status: 'idle',
  goal: {
    original: 'Fix value export.',
    current: 'Fix value export.',
    updates: [],
  },
  messages: [],
  runtimeActions: [],
  timeline: [],
  createdAt: '2026-05-25T00:00:00.000Z',
  updatedAt: '2026-05-25T00:00:00.000Z',
  decisions: [],
};

const sandboxResult: PatchSandboxResult = {
  id: 'sandbox-report-test',
  status: 'failed',
  proposalId: 'proposal-report-test',
  sessionId: session.id,
  projectRoot: session.projectRoot,
  workspace: null,
  applyResult: null,
  verifyRuns: [],
  issues: [
    {
      code: 'SANDBOX_VERIFY_FAILED',
      message: 'One or more sandbox verify commands failed.',
      severity: 'error',
    },
  ],
  startedAt: '2026-05-25T00:00:00.000Z',
  completedAt: '2026-05-25T00:00:01.000Z',
};

const recovery: PatchRecoveryLoopResult = {
  id: 'recovery-report-test',
  status: 'repair_prompt_ready',
  proposalId: 'proposal-report-test',
  sessionId: session.id,
  currentAttempt: 1,
  maxAttempts: 2,
  attempts: [
    {
      attemptNumber: 1,
      proposalId: 'proposal-report-test',
      sandboxResultId: sandboxResult.id,
      failureReport: {
        id: 'failure-report-test',
        status: 'failed',
        proposalId: 'proposal-report-test',
        planId: 'plan-report-test',
        sessionId: session.id,
        projectRoot: session.projectRoot,
        summary: 'Sandbox verification failed with 1 failing verify command.',
        failedFiles: ['src/value.ts'],
        sandboxResultId: sandboxResult.id,
        sandboxStatus: 'failed',
        sandboxIssues: sandboxResult.issues,
        applyStatus: 'not_applied',
        verifyFailures: [],
        originalPatchSummary: {
          fileCount: 1,
          riskLevel: 'low',
          files: [],
        },
        createdAt: '2026-05-25T00:00:01.000Z',
      },
      repairPrompt: {
        system: 'system',
        user: 'Repair src/value.ts safely.',
        constraints: ['Do not apply files directly.'],
        metadata: {
          proposalId: 'proposal-report-test',
          failureReportId: 'failure-report-test',
          sessionId: session.id,
          currentAttempt: 1,
          maxAttempts: 2,
        },
      },
      createdAt: '2026-05-25T00:00:02.000Z',
    },
  ],
  issues: [],
  createdAt: '2026-05-25T00:00:02.000Z',
};

const report = new SessionReportBuilder().build({
  session,
  sandboxResults: [sandboxResult],
  patchRecoveries: [recovery],
});

assert(report.summary.sandboxResults === 1, 'Expected one sandbox result.');
assert(report.summary.failedSandboxResults === 1, 'Expected one failed sandbox result.');
assert(report.summary.patchRecoveries === 1, 'Expected one patch recovery.');
assert(report.summary.recoveryAttempts === 1, 'Expected one recovery attempt.');
assert(report.sandboxResults[0]?.id === sandboxResult.id, 'Expected sandbox result in report.');
assert(report.patchRecoveries[0]?.id === recovery.id, 'Expected recovery in report.');

const markdown = new MarkdownReportExporter().export(report);

assert(markdown.includes('## Sandbox Results'), 'Expected sandbox section.');
assert(markdown.includes('## Patch Recoveries'), 'Expected patch recoveries section.');
assert(markdown.includes('Repair src/value.ts safely.'), 'Expected repair prompt in markdown.');

console.log(
  JSON.stringify(
    {
      message: 'Session report sandbox recovery test completed',
      summary: report.summary,
      markdownIncludesSandbox: markdown.includes('## Sandbox Results'),
      markdownIncludesRecovery: markdown.includes('## Patch Recoveries'),
    },
    null,
    2,
  ),
);
