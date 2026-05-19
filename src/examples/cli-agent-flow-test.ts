import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { CliRunner } from '../cli/CliRunner.js';
import { Logger } from '../observability/Logger.js';

const execFileAsync = promisify(execFile);

const logger = new Logger({
  namespace: 'zero-runtime:cli-agent-flow-test',
  level: 'debug',
});

interface AgentCommandOutputLike {
  action?: string;
  state?: AgentStateLike;
  text?: string;
}

interface AgentStateLike {
  id?: string;
  status?: string;
  projectName?: string;
  projectRoot?: string;
  objective?: string;
  targetFiles?: string[];
  approvals?: {
    id?: string;
    status?: string;
    scope?: string;
    actionId?: string;
  }[];
  actions?: {
    id?: string;
    kind?: string;
    status?: string;
  }[];
  metadata?: Record<string, unknown>;
}

async function main(): Promise<void> {
  const fixtureRoot = resolve('.runtime/cli-agent-flow-test/project');
  const targetFile = 'src/index.ts';

  await rm(resolve('.runtime/cli-agent-flow-test'), {
    recursive: true,
    force: true,
  });

  await mkdir(resolve(fixtureRoot, 'src'), {
    recursive: true,
  });

  await writeFile(
    resolve(fixtureRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'cli-agent-flow-fixture',
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
    resolve(fixtureRoot, 'tsconfig.json'),
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

  await writeFile(resolve(fixtureRoot, targetFile), 'export const value = 1;\n', 'utf8');

  await initializeGitFixture(fixtureRoot);

  const runner = new CliRunner();

  const startResult = await runner.run([
    'agent',
    'start',
    '--project',
    fixtureRoot,
    '--target',
    targetFile,
    '--name',
    'CLI Agent Flow Fixture',
    '--objective',
    'Run full CLI agent flow for src/index.ts',
    '--include-project-memory',
  ]);

  assertStatus(startResult.status, 'ok');

  const formattedStart = runner.format(startResult, 'text');

  assertIncludes(formattedStart, 'Zero Runtime agent');
  assertIncludes(formattedStart, 'Action: start');
  assertIncludes(formattedStart, 'CLI Agent Flow Fixture');

  const statusResult = await runner.run(['agent', 'status', '--project', fixtureRoot]);

  assertStatus(statusResult.status, 'ok');

  const formattedStatus = runner.format(statusResult, 'text');

  assertIncludes(formattedStatus, 'Zero Runtime agent');
  assertIncludes(formattedStatus, 'Action: status');

  const inspectResult = await runAgentStep(runner, fixtureRoot, 'inspect_project');
  const validateResult = await runAgentStep(runner, fixtureRoot, 'validate_project');
  const gitResult = await runAgentStep(runner, fixtureRoot, 'check_git');
  const repairResult = await runAgentStep(runner, fixtureRoot, 'request_repair_proposal');
  const diffResult = await runAgentStep(runner, fixtureRoot, 'show_diff_preview');
  const approvalRequestResult = await runAgentStep(runner, fixtureRoot, 'request_approval');

  const approvalRequestOutput = getAgentOutput(approvalRequestResult.output);
  const approvalId = approvalRequestOutput.state?.approvals?.[0]?.id;

  if (!approvalId) {
    throw new Error('Expected CLI agent approval id.');
  }

  const approveResult = await runner.run([
    'agent',
    'approve',
    approvalId,
    '--project',
    fixtureRoot,
    '--reason',
    'Approve CLI full agent flow patch application.',
  ]);

  assertStatus(approveResult.status, 'ok');

  const formattedApprove = runner.format(approveResult, 'text');

  assertIncludes(formattedApprove, 'Zero Runtime agent');
  assertIncludes(formattedApprove, 'Action: approve');
  assertIncludes(formattedApprove, 'approved');

  const applyResult = await runAgentStep(runner, fixtureRoot, 'apply_patch');
  const revalidateResult = await runAgentStep(runner, fixtureRoot, 'revalidate_project');
  const reportResult = await runAgentStep(runner, fixtureRoot, 'report_result');

  const reportOutput = getAgentOutput(reportResult.output);

  assert(reportOutput.state?.status === 'completed', 'Expected CLI agent loop to complete.');

  const finalReportResult = await runner.run(['agent', 'report', '--project', fixtureRoot]);

  assertStatus(finalReportResult.status, 'ok');

  const formattedFinalReport = runner.format(finalReportResult, 'text');

  assertIncludes(formattedFinalReport, 'Zero Runtime Agent Loop');
  assertIncludes(formattedFinalReport, 'Status: completed');
  assertIncludes(formattedFinalReport, 'report_result');

  const finalContent = await readFile(resolve(fixtureRoot, targetFile), 'utf8');

  assert(
    finalContent === 'export const value = 1;\n',
    'Expected deterministic fake patch content.',
  );

  const finalStateRaw = await readFile(
    resolve(fixtureRoot, '.runtime/agent-loop-state.json'),
    'utf8',
  );

  const finalReportRaw = await readFile(
    resolve(fixtureRoot, '.runtime/agent-loop-report.md'),
    'utf8',
  );
  assertIncludes(finalStateRaw, '"includeProjectMemory": true');
  assertIncludes(finalStateRaw, '"status": "completed"');
  assertIncludes(finalStateRaw, '"execution_apply_patch"');
  assertIncludes(finalStateRaw, '"execution_revalidate_project"');
  assertIncludes(finalStateRaw, '"execution_report_result"');

  assertIncludes(finalReportRaw, 'Zero Runtime Agent Loop');
  assertIncludes(finalReportRaw, 'Status: completed');

  logger.info('CLI agent flow test completed', {
    commands: {
      start: startResult.status,
      status: statusResult.status,
      inspect: inspectResult.status,
      validate: validateResult.status,
      git: gitResult.status,
      repair: repairResult.status,
      diff: diffResult.status,
      requestApproval: approvalRequestResult.status,
      approve: approveResult.status,
      apply: applyResult.status,
      revalidate: revalidateResult.status,
      reportResult: reportResult.status,
      report: finalReportResult.status,
    },
    approvalId,
    finalStateStatus: reportOutput.state?.status,
    finalContent,
    statePath: resolve(fixtureRoot, '.runtime/agent-loop-state.json'),
    reportPath: resolve(fixtureRoot, '.runtime/agent-loop-report.md'),
  });

  logger.info('Session 40.B CLI agent full flow test passed');
}

async function runAgentStep(
  runner: CliRunner,
  projectRoot: string,
  stepKind: string,
): Promise<Awaited<ReturnType<CliRunner['run']>>> {
  const result = await runner.run(['agent', 'step', stepKind, '--project', projectRoot]);

  assertStatus(result.status, 'ok');

  const formatted = runner.format(result, 'text');

  assertIncludes(formatted, 'Zero Runtime agent');
  assertIncludes(formatted, 'Action: step');
  assertIncludes(formatted, stepKind);

  return result;
}

async function initializeGitFixture(projectRoot: string): Promise<void> {
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
  logger.error('CLI agent flow test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
