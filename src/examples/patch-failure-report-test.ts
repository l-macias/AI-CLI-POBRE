import type { PatchSandboxResult } from '../sandbox/SandboxResult.js';
import { PatchFailureReportBuilder } from '../patches/PatchFailureReport.js';
import { PatchRepairPromptBuilder } from '../patches/PatchRepairPromptBuilder.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const proposal: RuntimePatchProposal = {
  id: 'proposal-failure-report-test',
  planId: 'plan-failure-report-test',
  sessionId: 'session-failure-report-test',
  projectRoot: '/tmp/zero-runtime-failure-report-test',
  summary: 'Validate patch failure report.',
  files: [
    {
      path: 'src/value.ts',
      operation: 'modify',
      beforeHash: 'hash-value',
      content: 'export const value: number = "broken";\n',
      reason: 'Introduce failing content for failure report test.',
      changesSummary: ['Changes value file in a way that fails verification.'],
      riskLevel: 'low',
      userSelectable: true,
    },
  ],
  risks: [
    {
      code: 'LOW_RISK_PATCH_PROPOSAL',
      level: 'low',
      message: 'Patch proposal is limited to low-impact files.',
      mitigation: 'Still require diff preview and user approval.',
    },
  ],
  verifyCommands: [
    {
      command: 'npm',
      args: ['run', 'typecheck'],
      reason: 'Validate TypeScript after patch.',
      requiresApproval: true,
    },
  ],
  riskLevel: 'low',
  requiresApproval: true,
  status: 'validated',
  createdAt: '2026-05-25T00:00:00.000Z',
};

const sandboxResult: PatchSandboxResult = {
  id: 'patch-sandbox-failure-report-test',
  status: 'failed',
  proposalId: proposal.id,
  sessionId: proposal.sessionId,
  projectRoot: proposal.projectRoot,
  workspace: {
    sandboxId: 'sandbox-failure-report-test',
    sessionId: proposal.sessionId,
    sourceProjectRoot: proposal.projectRoot,
    sandboxRoot: '/tmp/sandbox',
    workspaceRoot: '/tmp/sandbox/workspace',
    createdAt: '2026-05-25T00:00:00.000Z',
  },
  applyResult: null,
  verifyRuns: [
    {
      command: 'npm run typecheck',
      cwd: '/tmp/sandbox/workspace',
      status: 'executed',
      exitCode: 1,
      stdoutSummary: 'src/value.ts: Type string is not assignable to number.',
      stderrSummary: '',
      issues: [],
      startedAt: '2026-05-25T00:00:01.000Z',
      completedAt: '2026-05-25T00:00:02.000Z',
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
  completedAt: '2026-05-25T00:00:02.000Z',
};

const report = new PatchFailureReportBuilder().build({
  proposal,
  sandboxResult,
});

assert(report.status === 'failed', 'Expected failure report status failed.');
assert(report.proposalId === proposal.id, 'Expected report proposal id.');
assert(report.verifyFailures.length === 1, 'Expected one verify failure.');
const firstVerifyFailure = report.verifyFailures[0];

if (!firstVerifyFailure) {
  throw new Error('Expected first verify failure.');
}

assert(
  firstVerifyFailure.stdoutSummary.includes('not assignable'),
  'Expected verify output to be preserved.',
);
assert(
  report.failedFiles.length === 1 && report.failedFiles[0] === 'src/value.ts',
  'Expected failed file path.',
);

const prompt = new PatchRepairPromptBuilder().build({
  originalObjective: 'Fix the value export safely.',
  proposal,
  failureReport: report,
  currentAttempt: 1,
  maxAttempts: 2,
});

assert(prompt.metadata.proposalId === proposal.id, 'Expected prompt proposal metadata.');
assert(prompt.user.includes('npm run typecheck'), 'Expected prompt to include failing command.');
assert(prompt.user.includes('not assignable'), 'Expected prompt to include verify failure output.');
assert(
  prompt.constraints.some((constraint) => constraint.includes('Do not apply files directly')),
  'Expected safe provider constraints.',
);

console.log(
  JSON.stringify(
    {
      message: 'Patch failure report test completed',
      report,
      prompt,
    },
    null,
    2,
  ),
);
