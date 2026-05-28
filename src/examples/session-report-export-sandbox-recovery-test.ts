import { mkdir, readFile, rm } from 'node:fs/promises';
import type { InteractiveSessionState } from '../interactive/InteractiveSessionTypes.js';
import type { PatchRecoveryLoopResult } from '../patches/PatchRecoveryLoop.js';
import { PatchRecoveryStorage } from '../patches/PatchRecoveryStorage.js';
import { ReportStorage } from '../reports/ReportStorage.js';
import { SessionReportBuilder } from '../reports/SessionReportBuilder.js';
import type { PatchSandboxResult } from '../sandbox/SandboxResult.js';
import { SandboxResultStorage } from '../sandbox/SandboxResultStorage.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const sessionId = 'session-report-export-sandbox-recovery-test';
const runtimeRoot = '.runtime/session-report-export-sandbox-recovery-test';

await rm(runtimeRoot, {
  recursive: true,
  force: true,
});

await rm(`.runtime/sandbox-results/${sessionId}`, {
  recursive: true,
  force: true,
});

await rm(`.runtime/patch-recoveries/${sessionId}`, {
  recursive: true,
  force: true,
});

await mkdir(runtimeRoot, {
  recursive: true,
});

const session: InteractiveSessionState = {
  id: sessionId,
  projectRoot: '/tmp/session-report-export-project',
  projectName: 'session-report-export-project',
  status: 'idle',
  goal: {
    original: 'Validate report export with sandbox and recovery.',
    current: 'Validate report export with sandbox and recovery.',
    updates: [],
  },
  messages: [],
  runtimeActions: [
    {
      id: 'action-sandbox',
      title: 'Patch sandbox verification executed',
      description: 'Sandbox verification finished with status failed.',
      status: 'failed',
      createdAt: '2026-05-25T00:00:01.000Z',
      metadata: {},
    },
    {
      id: 'action-recovery',
      title: 'Patch recovery prepared',
      description: 'Patch recovery finished with status repair_prompt_ready.',
      status: 'completed',
      createdAt: '2026-05-25T00:00:02.000Z',
      metadata: {},
    },
  ],
  timeline: [],
  createdAt: '2026-05-25T00:00:00.000Z',
  updatedAt: '2026-05-25T00:00:02.000Z',
  decisions: [],
};

const sandboxResult: PatchSandboxResult = {
  id: 'sandbox-export-test',
  status: 'failed',
  proposalId: 'proposal-export-test',
  sessionId,
  projectRoot: session.projectRoot,
  workspace: null,
  applyResult: null,
  verifyRuns: [
    {
      command: 'npm run typecheck',
      cwd: '/tmp/workspace',
      status: 'executed',
      exitCode: 1,
      stdoutSummary: 'Type error from sandbox export test.',
      stderrSummary: '',
      issues: [],
      startedAt: '2026-05-25T00:00:00.000Z',
      completedAt: '2026-05-25T00:00:01.000Z',
      durationMs: 1000,
    },
  ],
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
  id: 'recovery-export-test',
  status: 'repair_prompt_ready',
  proposalId: 'proposal-export-test',
  sessionId,
  currentAttempt: 1,
  maxAttempts: 2,
  attempts: [
    {
      attemptNumber: 1,
      proposalId: 'proposal-export-test',
      sandboxResultId: sandboxResult.id,
      failureReport: {
        id: 'failure-export-test',
        status: 'failed',
        proposalId: 'proposal-export-test',
        planId: 'plan-export-test',
        sessionId,
        projectRoot: session.projectRoot,
        summary: 'Sandbox verification failed with 1 failing verify command.',
        failedFiles: ['src/value.ts'],
        sandboxResultId: sandboxResult.id,
        sandboxStatus: sandboxResult.status,
        sandboxIssues: sandboxResult.issues,
        applyStatus: 'not_applied',
        verifyFailures: [
          {
            command: 'npm run typecheck',
            status: 'executed',
            exitCode: 1,
            stdoutSummary: 'Type error from sandbox export test.',
            stderrSummary: '',
            issues: [],
          },
        ],
        originalPatchSummary: {
          fileCount: 1,
          riskLevel: 'low',
          files: [
            {
              path: 'src/value.ts',
              operation: 'modify',
              riskLevel: 'low',
              reason: 'Validate export.',
              changesSummary: ['Validate report export includes recovery.'],
            },
          ],
        },
        createdAt: '2026-05-25T00:00:01.000Z',
      },
      repairPrompt: {
        system: 'system',
        user: 'Repair src/value.ts after sandbox export test failure.',
        constraints: ['Do not apply files directly.'],
        metadata: {
          proposalId: 'proposal-export-test',
          failureReportId: 'failure-export-test',
          sessionId,
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

const sandboxStorage = new SandboxResultStorage();
const recoveryStorage = new PatchRecoveryStorage();

await sandboxStorage.save(sandboxResult);
await recoveryStorage.save(recovery);

const sandboxResults = await sandboxStorage.listBySession(sessionId);
const patchRecoveries = await recoveryStorage.listBySession(sessionId);

const report = new SessionReportBuilder().build({
  session,
  sandboxResults,
  patchRecoveries,
});

const reportStorage = new ReportStorage({
  rootDir: `${runtimeRoot}/reports`,
});

const saved = await reportStorage.save(report);

const markdown = await readFile(saved.markdownPath, 'utf8');
const jsonRaw = await readFile(saved.jsonPath, 'utf8');
const json = JSON.parse(jsonRaw) as {
  summary: {
    sandboxResults: number;
    failedSandboxResults: number;
    patchRecoveries: number;
    recoveryAttempts: number;
  };
  sandboxResults: unknown[];
  patchRecoveries: unknown[];
};

assert(report.summary.sandboxResults === 1, 'Expected report sandbox result count.');
assert(report.summary.failedSandboxResults === 1, 'Expected report failed sandbox count.');
assert(report.summary.patchRecoveries === 1, 'Expected report recovery count.');
assert(report.summary.recoveryAttempts === 1, 'Expected report recovery attempt count.');

assert(markdown.includes('## Sandbox Results'), 'Expected markdown sandbox section.');
assert(markdown.includes('## Patch Recoveries'), 'Expected markdown recovery section.');
assert(
  markdown.includes('Repair src/value.ts after sandbox export test failure.'),
  'Expected markdown repair prompt.',
);

assert(json.summary.sandboxResults === 1, 'Expected JSON sandbox result count.');
assert(json.summary.patchRecoveries === 1, 'Expected JSON recovery count.');
assert(json.sandboxResults.length === 1, 'Expected JSON sandbox results.');
assert(json.patchRecoveries.length === 1, 'Expected JSON patch recoveries.');

console.log(
  JSON.stringify(
    {
      message: 'Session report export sandbox recovery test completed',
      saved,
      summary: report.summary,
      markdownIncludesSandbox: markdown.includes('## Sandbox Results'),
      markdownIncludesRecovery: markdown.includes('## Patch Recoveries'),
    },
    null,
    2,
  ),
);
