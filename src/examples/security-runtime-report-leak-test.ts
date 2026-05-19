import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { AgentLoopReporter } from '../agent/AgentLoopReporter.js';
import type { AgentLoopState } from '../agent/AgentTypes.js';
import { ErrorReporter } from '../observability/ErrorReporter.js';
import { Logger } from '../observability/Logger.js';
import { PatchApplyReporter } from '../patch-apply/PatchApplyReporter.js';
import { PatchApplyRunner } from '../patch-apply/PatchApplyRunner.js';
import { RepairAttemptReporter } from '../repair/RepairAttemptReporter.js';
import type { PatchProposal, RepairAttemptResult } from '../types/RepairTypes.js';

const execFileAsync = promisify(execFile);

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const runtimeRoot = resolve('.runtime/security-runtime-report-leak-test');

  await rm(runtimeRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(runtimeRoot, {
    recursive: true,
  });

  const secret = 'sk-or-v1-secret-should-not-leak';

  const errorReporter = new ErrorReporter();
  const errorReport = errorReporter.report({
    source: 'security-runtime-report-leak-test',
    error: new Error(`Provider failed with OPENROUTER_API_KEY=${secret}`),
    metadata: {
      authorization: `Bearer ${secret}`,
    },
  });

  assert(
    !JSON.stringify(errorReport).includes('secret-should-not-leak'),
    'ErrorReporter must redact secrets from messages and metadata.',
  );

  const patchProjectRoot = resolve(runtimeRoot, 'patch-project');
  await resetGitFixture(patchProjectRoot);

  const patchReportPath = resolve(runtimeRoot, 'patch-apply-report.json');
  const patchReporter = new PatchApplyReporter({
    outputPath: patchReportPath,
  });

  const patchRunner = new PatchApplyRunner({
    reporter: patchReporter,
  });

  const secretPatchProposal: PatchProposal = {
    id: 'proposal-leak-test',
    summary: 'Secret leak fixture.',
    riskLevel: 'high',
    operations: [
      {
        kind: 'replace_file',
        targetFile: 'src/index.ts',
        expectedCurrentContent: 'export const value = 1;\n',
        newContent: `export const key = "${secret}";\n`,
        reason: `Test secret ${secret}`,
      },
    ],
    explanation: `Must redact ${secret}`,
  };

  const patchResult = await patchRunner.run({
    projectRoot: patchProjectRoot,
    proposal: secretPatchProposal,
    applyConfirmed: true,
    allowDirtyWorkingTree: true,
  });

  assert(
    patchResult.status === 'blocked',
    'Secret-bearing patch should be blocked before application.',
  );

  const patchReportRaw = await readFile(patchReportPath, 'utf8');

  assert(
    !patchReportRaw.includes('secret-should-not-leak'),
    'PatchApplyReporter must redact secrets from JSON report.',
  );
  assert(
    patchReportRaw.includes('[REDACTED]'),
    'PatchApplyReporter report should include redaction marker.',
  );

  const repairReportPath = resolve(runtimeRoot, 'repair-report.md');
  const repairReporter = new RepairAttemptReporter({
    outputPath: repairReportPath,
  });

  await repairReporter.write(createRepairAttemptResult(secret));

  const repairReportRaw = await readFile(repairReportPath, 'utf8');

  assert(
    !repairReportRaw.includes('secret-should-not-leak'),
    'RepairAttemptReporter must redact secrets from markdown report.',
  );

  const agentReportPath = resolve(runtimeRoot, 'agent-report.md');
  const agentReporter = new AgentLoopReporter({
    outputPath: agentReportPath,
  });

  await agentReporter.write(createAgentLoopState(secret));

  const agentReportRaw = await readFile(agentReportPath, 'utf8');

  assert(
    !agentReportRaw.includes('secret-should-not-leak'),
    'AgentLoopReporter must redact secrets from agent report.',
  );

  const logger = new Logger({
    namespace: 'zero-runtime:security-runtime-report-leak-test',
    level: 'debug',
  });

  logger.info('Logger redaction smoke test', {
    apiKey: secret,
    nested: {
      authorization: `Bearer ${secret}`,
    },
  });

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'security-runtime-report-leak-test',
        patchStatus: patchResult.status,
      },
      null,
      2,
    ),
  );
}

function createRepairAttemptResult(secret: string): RepairAttemptResult {
  const now = new Date().toISOString();

  return {
    id: 'repair-report-leak-test',
    status: 'proposal_invalid',
    objective: `Do not leak ${secret}`,
    projectRoot: '/tmp/security-runtime-report-leak-test',
    request: {
      id: 'repair-request-leak-test',
      objective: `Do not leak ${secret}`,
      projectRoot: '/tmp/security-runtime-report-leak-test',
      targetFiles: [
        {
          relativePath: 'src/index.ts',
          exists: true,
          content: `const secret = "${secret}";`,
          bytes: 1,
        },
      ],
      findings: [
        {
          id: 'finding-secret',
          source: 'test',
          message: `Secret ${secret}`,
          severity: 'error',
        },
      ],
      constraints: [],
      expectedOutput: {
        format: 'json_patch_proposal',
        allowedOperations: ['replace_file'],
        requireExplanation: true,
        requireRiskAssessment: true,
      },
    },
    prompt: `Prompt with ${secret}`,
    proposal: {
      id: 'proposal-secret',
      summary: `Summary ${secret}`,
      riskLevel: 'high',
      operations: [
        {
          kind: 'replace_file',
          targetFile: 'src/index.ts',
          newContent: `const secret = "${secret}";`,
          reason: `Reason ${secret}`,
        },
      ],
      explanation: `Explanation ${secret}`,
    },
    patchValidation: {
      valid: false,
      issues: [
        {
          code: 'SECRET',
          message: `Secret ${secret}`,
          severity: 'error',
        },
      ],
    },
    diffPreviews: [
      {
        targetFile: 'src/index.ts',
        changed: true,
        changedLines: 1,
        markdown: `- ${secret}`,
      },
    ],
    steps: [],
    blockers: [`Blocked ${secret}`],
    failures: [`Failure ${secret}`],
    createdAt: now,
    completedAt: now,
  };
}

function createAgentLoopState(secret: string): AgentLoopState {
  const now = new Date().toISOString();

  return {
    id: 'agent-report-leak-test',
    status: 'running',
    objective: `Objective ${secret}`,
    projectRoot: '/tmp/security-runtime-report-leak-test',
    projectName: 'Security Runtime Report Leak Test',
    targetFiles: ['src/index.ts'],
    turns: [
      {
        id: 'turn-secret',
        role: 'runtime',
        message: `Turn ${secret}`,
        createdAt: now,
      },
    ],
    actions: [],
    decisions: [],
    approvals: [],
    issues: [
      {
        code: 'SECRET',
        message: `Issue ${secret}`,
        severity: 'error',
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

async function resetGitFixture(projectRoot: string): Promise<void> {
  await rm(projectRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(resolve(projectRoot, 'src'), {
    recursive: true,
  });

  await writeFile(resolve(projectRoot, 'src/index.ts'), 'export const value = 1;\n', 'utf8');

  await execFileAsync('git', ['init', '-b', 'test-branch'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'user.email', 'zero-runtime@example.local'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'user.name', 'Zero Runtime Test'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'core.autocrlf', 'false'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'core.eol', 'lf'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await writeFile(resolve(projectRoot, '.gitattributes'), '* text eol=lf\n', 'utf8');

  await execFileAsync('git', ['add', '.'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['commit', '-m', 'initial commit'], {
    cwd: projectRoot,
    windowsHide: true,
  });
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: 'failed',
        test: 'security-runtime-report-leak-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
