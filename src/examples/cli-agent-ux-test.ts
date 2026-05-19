import { execFile } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { CliRunner } from '../cli/CliRunner.js';
import { Logger } from '../observability/Logger.js';

const execFileAsync = promisify(execFile);

const logger = new Logger({
  namespace: 'zero-runtime:cli-agent-ux-test',
  level: 'debug',
});

interface AgentCommandOutputLike {
  action?: string;
  state?: {
    approvals?: {
      id?: string;
      status?: string;
    }[];
  };
  text?: string;
}

async function main(): Promise<void> {
  const fixtureRoot = resolve('.runtime/cli-agent-ux-test/project');
  const missingLoopRoot = resolve('.runtime/cli-agent-ux-test/missing-loop-project');
  const targetFile = 'src/index.ts';

  await rm(resolve('.runtime/cli-agent-ux-test'), {
    recursive: true,
    force: true,
  });

  await createFixtureProject(fixtureRoot, targetFile);
  await createFixtureProject(missingLoopRoot, targetFile);

  const runner = new CliRunner();

  const missingStatusResult = await runner.run(['agent', 'status', '--project', missingLoopRoot]);

  assertStatus(missingStatusResult.status, 'error');

  const formattedMissingStatus = runner.format(missingStatusResult, 'text');

  assertIncludes(formattedMissingStatus, 'No agent loop state found');

  const resetWithoutConfirmResult = await runner.run(['agent', 'reset', '--project', fixtureRoot]);

  assertStatus(resetWithoutConfirmResult.status, 'error');

  const resetWithoutConfirmText = runner.format(resetWithoutConfirmResult, 'text');
  const resetWithoutConfirmJson = runner.format(resetWithoutConfirmResult, 'json');

  assert(
    resetWithoutConfirmText.includes('agent reset requires --confirm-reset') ||
      resetWithoutConfirmJson.includes('agent reset requires --confirm-reset') ||
      resetWithoutConfirmJson.includes('CLI_AGENT_CONFIRM_RESET_REQUIRED'),
    'Expected reset without confirm to expose confirm-reset requirement.',
  );

  const startResult = await runner.run([
    'agent',
    'start',
    '--project',
    fixtureRoot,
    '--target',
    targetFile,
    '--name',
    'CLI Agent UX Fixture',
    '--objective',
    'Run CLI agent UX hardening test.',
  ]);

  assertStatus(startResult.status, 'ok');

  const actionsResult = await runner.run(['agent', 'actions', '--project', fixtureRoot]);
  const approvalsBeforeResult = await runner.run(['agent', 'approvals', '--project', fixtureRoot]);
  const nextResult = await runner.run(['agent', 'next', '--project', fixtureRoot]);

  assertStatus(actionsResult.status, 'ok');
  assertStatus(approvalsBeforeResult.status, 'ok');
  assertStatus(nextResult.status, 'ok');

  const formattedActions = runner.format(actionsResult, 'text');
  const formattedApprovalsBefore = runner.format(approvalsBeforeResult, 'text');
  const formattedNext = runner.format(nextResult, 'text');

  assertIncludes(formattedActions, 'Actions:');
  assertIncludes(formattedActions, 'inspect_project');
  assertIncludes(formattedApprovalsBefore, 'Approvals:');
  assertIncludes(formattedApprovalsBefore, '- none');
  assertIncludes(formattedNext, 'Zero Runtime agent next');
  assertIncludes(formattedNext, 'inspect_project');

  const earlyReportResult = await runner.run([
    'agent',
    'step',
    'report_result',
    '--project',
    fixtureRoot,
  ]);

  assertStatus(earlyReportResult.status, 'error');

  const formattedEarlyReport = runner.format(earlyReportResult, 'text');

  assertIncludes(formattedEarlyReport, 'requires apply_patch and revalidate_project');

  await runAgentStep(runner, fixtureRoot, 'inspect_project');
  await runAgentStep(runner, fixtureRoot, 'validate_project');
  await runAgentStep(runner, fixtureRoot, 'check_git');
  await runAgentStep(runner, fixtureRoot, 'request_repair_proposal');
  await runAgentStep(runner, fixtureRoot, 'show_diff_preview');
  const approvalRequestResult = await runAgentStep(runner, fixtureRoot, 'request_approval');

  const approvalOutput = getAgentOutput(approvalRequestResult.output);
  const approvalId = approvalOutput.state?.approvals?.[0]?.id;

  if (!approvalId) {
    throw new Error('Expected approval id.');
  }

  const badApprovalResult = await runner.run([
    'agent',
    'approve',
    'agent-approval-does-not-exist',
    '--project',
    fixtureRoot,
  ]);

  assertStatus(badApprovalResult.status, 'error');

  const formattedBadApproval = runner.format(badApprovalResult, 'text');

  assertIncludes(formattedBadApproval, 'Agent approval not found');

  const approveResult = await runner.run([
    'agent',
    'approve',
    approvalId,
    '--project',
    fixtureRoot,
    '--reason',
    'Approve UX hardening test.',
  ]);

  assertStatus(approveResult.status, 'ok');

  const approvalsAfterResult = await runner.run(['agent', 'approvals', '--project', fixtureRoot]);

  assertStatus(approvalsAfterResult.status, 'ok');

  const formattedApprovalsAfter = runner.format(approvalsAfterResult, 'text');

  assertIncludes(formattedApprovalsAfter, approvalId);
  assertIncludes(formattedApprovalsAfter, 'approved');

  const resetResult = await runner.run([
    'agent',
    'reset',
    '--project',
    fixtureRoot,
    '--confirm-reset',
  ]);

  assertStatus(resetResult.status, 'ok');

  const formattedReset = runner.format(resetResult, 'text');

  assertIncludes(formattedReset, 'Action: reset');
  assertIncludes(formattedReset, 'Agent loop state removed');

  const statusAfterResetResult = await runner.run(['agent', 'status', '--project', fixtureRoot]);

  assertStatus(statusAfterResetResult.status, 'error');

  logger.info('CLI agent UX hardening test completed', {
    commands: {
      missingStatus: missingStatusResult.status,
      resetWithoutConfirm: resetWithoutConfirmResult.status,
      start: startResult.status,
      actions: actionsResult.status,
      approvalsBefore: approvalsBeforeResult.status,
      next: nextResult.status,
      earlyReport: earlyReportResult.status,
      badApproval: badApprovalResult.status,
      approve: approveResult.status,
      approvalsAfter: approvalsAfterResult.status,
      reset: resetResult.status,
      statusAfterReset: statusAfterResetResult.status,
    },
    approvalId,
  });

  logger.info('Session 40.C CLI agent UX hardening test passed');
}

async function createFixtureProject(projectRoot: string, targetFile: string): Promise<void> {
  await mkdir(resolve(projectRoot, 'src'), {
    recursive: true,
  });

  await writeFile(
    resolve(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'cli-agent-ux-fixture',
        scripts: {
          typecheck: 'tsc --noEmit',
        },
        devDependencies: {
          typescript: '^5.7.2',
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  await writeFile(
    resolve(projectRoot, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ),
    'utf8',
  );

  await writeFile(resolve(projectRoot, targetFile), 'export const value = 1;\n', 'utf8');

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

async function runAgentStep(
  runner: CliRunner,
  projectRoot: string,
  stepKind: string,
): Promise<Awaited<ReturnType<CliRunner['run']>>> {
  const result = await runner.run(['agent', 'step', stepKind, '--project', projectRoot]);

  assertStatus(result.status, 'ok');

  return result;
}

function getAgentOutput(output: unknown): AgentCommandOutputLike {
  if (typeof output !== 'object' || output === null || Array.isArray(output)) {
    throw new Error('Expected agent command object output.');
  }

  return output;
}

function assertStatus(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Expected status "${expected}", received "${actual}".`);
  }
}

function assertIncludes(value: string, expected: string): void {
  if (!value.includes(expected)) {
    throw new Error(`Expected output to include "${expected}".`);
  }
}
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}
main().catch((error: unknown) => {
  logger.error('CLI agent UX hardening test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
