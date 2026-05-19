import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { runCli } from '../cli.js';
import { CliRouter } from '../cli/CliRouter.js';
import { CliRunner } from '../cli/CliRunner.js';
import { createCliCommandRegistry } from '../cli/createCliCommandRegistry.js';
import { Logger } from '../observability/Logger.js';
import type { PatchProposal } from '../types/RepairTypes.js';

const execFileAsync = promisify(execFile);

const logger = new Logger({
  namespace: 'zero-runtime:cli-test',
  level: 'debug',
});

async function main(): Promise<void> {
  const fixtureRoot = resolve('.runtime/cli-tests/sample-project');

  await rm(fixtureRoot, {
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
        name: 'cli-fixture',
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

  await writeFile(resolve(fixtureRoot, 'src/index.ts'), 'export const value = 1;\n', 'utf8');

  const runner = new CliRunner();

  const registry = createCliCommandRegistry();
  const registeredCommands = registry.list();
  const requiredCommands = [
    'help',
    'init',
    'inspect',
    'validate',
    'repair',
    'status',
    'doctor',
    'project',
    'git',
    'patch',
    'agent',
    'security',
  ] as const;

  for (const commandName of requiredCommands) {
    if (!registeredCommands.includes(commandName)) {
      throw new Error(`Expected CLI command to be registered: ${commandName}`);
    }
  }

  const router = new CliRouter({
    registry,
  });

  const routedHelpOutput = await router.route({
    name: 'help',
    format: 'text',
  });

  if (typeof routedHelpOutput !== 'string' || !routedHelpOutput.includes('Zero Runtime CLI')) {
    throw new Error('Expected router to execute help command.');
  }

  const helpResult = await runner.run(['help']);
  const initResult = await runner.run(['init', '--project', fixtureRoot]);
  const statusResult = await runner.run(['status', '--project', fixtureRoot]);
  const doctorResult = await runner.run(['doctor', '--project', fixtureRoot]);

  const inspectResult = await runner.run([
    'inspect',
    '--project',
    fixtureRoot,
    '--target',
    'src/index.ts',
    '--name',
    'CLI Fixture',
  ]);

  const validateResult = await runner.run([
    'validate',
    '--project',
    fixtureRoot,
    '--target',
    'src/index.ts',
    '--name',
    'CLI Fixture',
  ]);

  const repairResult = await runner.run([
    'repair',
    '--project',
    fixtureRoot,
    '--target',
    'src/index.ts',
    '--name',
    'CLI Fixture',
  ]);

  const fakeMarkdownRepairResult = await runner.run([
    'repair',
    '--project',
    fixtureRoot,
    '--target',
    'src/index.ts',
    '--name',
    'CLI Fixture',
    '--provider',
    'fake-llm',
    '--fake-provider-mode',
    'markdown_json',
  ]);

  const staticRepairResult = await runner.run([
    'repair',
    '--project',
    fixtureRoot,
    '--target',
    'src/index.ts',
    '--name',
    'CLI Fixture',
    '--provider',
    'static',
  ]);

  const agentStartResult = await runner.run([
    'agent',
    'start',
    '--project',
    fixtureRoot,
    '--target',
    'src/index.ts',
    '--name',
    'CLI Agent Fixture',
    '--objective',
    'Run CLI agent start smoke test.',
  ]);

  const agentStatusResult = await runner.run(['agent', 'status', '--project', fixtureRoot]);

  const workspaceRoot = resolve('.runtime/cli-tests/workspace-root');
  const targetProjectRoot = resolve('.runtime/cli-tests/managed-target-project');

  await rm(workspaceRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(targetProjectRoot, {
    recursive: true,
  });

  await writeFile(
    resolve(targetProjectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'managed-target-project',
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
    resolve(targetProjectRoot, 'tsconfig.json'),
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

  await mkdir(resolve(targetProjectRoot, 'src'), {
    recursive: true,
  });

  await writeFile(
    resolve(targetProjectRoot, 'src/index.ts'),
    'export const managed = true;\n',
    'utf8',
  );

  const projectAddResult = await runner.run([
    'project',
    'add',
    '--project',
    workspaceRoot,
    '--path',
    targetProjectRoot,
    '--name',
    'Managed Target Project',
  ]);

  const projectListResult = await runner.run(['project', 'list', '--project', workspaceRoot]);
  const projectCurrentResult = await runner.run(['project', 'current', '--project', workspaceRoot]);

  const projectUseResult = await runner.run([
    'project',
    'use',
    'Managed Target Project',
    '--project',
    workspaceRoot,
  ]);

  const workspaceManagedInspectResult = await withTemporaryCwd(workspaceRoot, async () => {
    return runner.run(['inspect', '--target', 'package.json']);
  });

  const workspaceManagedValidateResult = await withTemporaryCwd(workspaceRoot, async () => {
    return runner.run(['validate', '--target', 'package.json']);
  });

  const workspaceManagedRepairResult = await withTemporaryCwd(workspaceRoot, async () => {
    return runner.run(['repair', '--target', 'package.json']);
  });

  const gitRepoRoot = resolve('.runtime/cli-tests/git-managed-project');

  await resetGitFixture(gitRepoRoot);

  const gitStatusCleanResult = await runner.run(['git', 'status', '--project', gitRepoRoot]);
  const gitDoctorCleanResult = await runner.run(['git', 'doctor', '--project', gitRepoRoot]);

  await writeFile(resolve(gitRepoRoot, 'tracked.txt'), 'changed content\n', 'utf8');
  await writeFile(resolve(gitRepoRoot, 'untracked.txt'), 'untracked content\n', 'utf8');

  const gitStatusDirtyResult = await runner.run(['git', 'status', '--project', gitRepoRoot]);

  const gitDiffResult = await runner.run([
    'git',
    'diff',
    '--project',
    gitRepoRoot,
    '--target',
    'tracked.txt',
  ]);

  const gitDoctorDirtyResult = await runner.run(['git', 'doctor', '--project', gitRepoRoot]);

  const gitDoctorAllowDirtyResult = await runner.run([
    'git',
    'doctor',
    '--project',
    gitRepoRoot,
    '--allow-dirty',
  ]);

  const gitAwareRepairResult = await runner.run([
    'repair',
    '--project',
    gitRepoRoot,
    '--target',
    'tracked.txt',
    '--name',
    'Git Aware Repair Fixture',
  ]);

  const patchProjectRoot = resolve('.runtime/cli-tests/patch-apply-project');
  const patchProposalPath = resolve('.runtime/cli-tests/patch-proposal.json');
  const invalidPatchProposalPath = resolve('.runtime/cli-tests/invalid-patch-proposal.json');
  const invalidPatchShapePath = resolve('.runtime/cli-tests/invalid-patch-shape.json');

  await resetPatchApplyFixture(patchProjectRoot);

  const patchProposal: PatchProposal = {
    id: 'cli-patch-apply-proposal',
    summary: 'Apply patch through CLI.',
    riskLevel: 'low',
    operations: [
      {
        kind: 'replace_file',
        targetFile: 'src/patch-target.ts',
        newContent: 'export const patched = true;\n',
        expectedCurrentContent: 'export const patched = false;\n',
        reason: 'Verify CLI controlled patch application.',
      },
    ],
    explanation: 'CLI integration test proposal.',
  };

  await writeFile(patchProposalPath, `${JSON.stringify(patchProposal, null, 2)}\n`, 'utf8');

  await writeFile(invalidPatchProposalPath, '{ invalid json', 'utf8');

  await writeFile(
    invalidPatchShapePath,
    JSON.stringify(
      {
        id: 'invalid-shape',
        summary: 'Invalid operation shape.',
        riskLevel: 'low',
        operations: [
          {
            kind: 'unknown_operation',
            targetFile: 'src/patch-target.ts',
            reason: 'Invalid kind should be rejected.',
          },
        ],
        explanation: 'Invalid proposal.',
      },
      null,
      2,
    ),
    'utf8',
  );

  const patchApplyBlockedWithoutConfirmResult = await runner.run([
    'patch',
    'apply',
    '--project',
    patchProjectRoot,
    '--proposal',
    patchProposalPath,
  ]);

  const invalidPatchJsonResult = await runner.run([
    'patch',
    'apply',
    '--project',
    patchProjectRoot,
    '--proposal',
    invalidPatchProposalPath,
    '--confirm-apply',
  ]);

  const invalidPatchShapeResult = await runner.run([
    'patch',
    'apply',
    '--project',
    patchProjectRoot,
    '--proposal',
    invalidPatchShapePath,
    '--confirm-apply',
  ]);

  const patchApplyResult = await runner.run([
    'patch',
    'apply',
    '--project',
    patchProjectRoot,
    '--proposal',
    patchProposalPath,
    '--confirm-apply',
  ]);

  const patchedContent = await readFile(resolve(patchProjectRoot, 'src/patch-target.ts'), 'utf8');

  if (patchedContent !== 'export const patched = true;\n') {
    throw new Error('Expected CLI patch apply to write patched content.');
  }

  const projectRemoveResult = await runner.run([
    'project',
    'remove',
    'managed-target-project',
    '--project',
    workspaceRoot,
  ]);

  const unknownResult = await runner.run(['unknown-command']);

  const formattedInspect = runner.format(inspectResult, 'text');
  const formattedValidate = runner.format(validateResult, 'text');
  const formattedRepair = runner.format(repairResult, 'text');
  const formattedFakeMarkdownRepair = runner.format(fakeMarkdownRepairResult, 'text');
  const formattedStaticRepair = runner.format(staticRepairResult, 'text');
  const formattedAgentStart = runner.format(agentStartResult, 'text');
  const formattedAgentStatus = runner.format(agentStatusResult, 'text');
  const formattedDoctor = runner.format(doctorResult, 'text');
  const formattedProjectList = runner.format(projectListResult, 'text');
  const formattedWorkspaceManagedInspect = runner.format(workspaceManagedInspectResult, 'text');
  const formattedWorkspaceManagedValidate = runner.format(workspaceManagedValidateResult, 'text');
  const formattedWorkspaceManagedRepair = runner.format(workspaceManagedRepairResult, 'text');
  const formattedGitStatusClean = runner.format(gitStatusCleanResult, 'text');
  const formattedGitStatusDirty = runner.format(gitStatusDirtyResult, 'text');
  const formattedGitDiff = runner.format(gitDiffResult, 'text');
  const formattedGitDoctorDirty = runner.format(gitDoctorDirtyResult, 'text');
  const formattedGitDoctorAllowDirty = runner.format(gitDoctorAllowDirtyResult, 'text');
  const formattedGitAwareRepair = runner.format(gitAwareRepairResult, 'text');
  const formattedPatchApply = runner.format(patchApplyResult, 'text');
  const formattedInvalidPatchJson = runner.format(invalidPatchJsonResult, 'text');
  const formattedInvalidPatchShape = runner.format(invalidPatchShapeResult, 'text');
  const formattedJson = runner.format(validateResult, 'json');

  const capturedOutput = await captureConsoleOutput(async () => {
    const exitCode = await runCli(['doctor', '--project', fixtureRoot]);

    if (exitCode !== 0) {
      throw new Error(`Expected runCli doctor exit code 0, received ${exitCode}.`);
    }
  });

  assertIncludes(capturedOutput.join('\n'), 'Zero Runtime doctor');

  const capturedUnknownOutput = await captureConsoleOutput(async () => {
    const exitCode = await runCli(['unknown-command']);

    if (exitCode !== 1) {
      throw new Error(`Expected runCli unknown command exit code 1, received ${exitCode}.`);
    }
  });

  assertIncludes(capturedUnknownOutput.join('\n'), 'Zero Runtime CLI');

  logger.info('CLI test completed', {
    commands: {
      help: helpResult.status,
      init: initResult.status,
      status: statusResult.status,
      doctor: doctorResult.status,
      inspect: inspectResult.status,
      validate: validateResult.status,
      repair: repairResult.status,
      fakeMarkdownRepair: fakeMarkdownRepairResult.status,
      staticRepair: staticRepairResult.status,
      agentStart: agentStartResult.status,
      agentStatus: agentStatusResult.status,
      projectAdd: projectAddResult.status,
      projectList: projectListResult.status,
      projectCurrent: projectCurrentResult.status,
      projectUse: projectUseResult.status,
      workspaceManagedInspect: workspaceManagedInspectResult.status,
      workspaceManagedValidate: workspaceManagedValidateResult.status,
      workspaceManagedRepair: workspaceManagedRepairResult.status,
      gitStatusClean: gitStatusCleanResult.status,
      gitDoctorClean: gitDoctorCleanResult.status,
      gitStatusDirty: gitStatusDirtyResult.status,
      gitDiff: gitDiffResult.status,
      gitDoctorDirty: gitDoctorDirtyResult.status,
      gitDoctorAllowDirty: gitDoctorAllowDirtyResult.status,
      gitAwareRepair: gitAwareRepairResult.status,
      patchApplyBlockedWithoutConfirm: patchApplyBlockedWithoutConfirmResult.status,
      invalidPatchJson: invalidPatchJsonResult.status,
      invalidPatchShape: invalidPatchShapeResult.status,
      patchApply: patchApplyResult.status,
      projectRemove: projectRemoveResult.status,
      unknown: unknownResult.status,
    },
    registeredCommands,
    formattedOutputChecks: {
      inspect: formattedInspect.includes('Zero Runtime inspect'),
      validate: formattedValidate.includes('Zero Runtime validate'),
      repair: formattedRepair.includes('Zero Runtime repair'),
      fakeMarkdownRepair: formattedFakeMarkdownRepair.includes('Provider requested: fake-llm'),
      staticRepair: formattedStaticRepair.includes('Provider requested: static'),
      agentStart: formattedAgentStart.includes('Zero Runtime agent'),
      agentStatus: formattedAgentStatus.includes('Zero Runtime agent'),
      doctor: formattedDoctor.includes('Zero Runtime doctor'),
      project: formattedProjectList.includes('Managed Target Project'),
      workspaceManagedInspect: formattedWorkspaceManagedInspect.includes('Managed Target Project'),
      workspaceManagedValidate:
        formattedWorkspaceManagedValidate.includes('Managed Target Project'),
      workspaceManagedRepair: formattedWorkspaceManagedRepair.includes(targetProjectRoot),
      gitStatusClean: formattedGitStatusClean.includes('Working tree: clean'),
      gitStatusDirty: formattedGitStatusDirty.includes('Working tree: dirty'),
      gitDiff: formattedGitDiff.includes('changed content'),
      gitDoctorDirty: formattedGitDoctorDirty.includes('Decision: blocked'),
      gitDoctorAllowDirty: formattedGitDoctorAllowDirty.includes('Decision: warning'),
      gitAwareRepair: formattedGitAwareRepair.includes('Git boundary'),
      patchApply: formattedPatchApply.includes('Zero Runtime patch apply'),
      invalidPatchJson: formattedInvalidPatchJson.includes('Invalid patch proposal JSON'),
      invalidPatchShape: formattedInvalidPatchShape.includes(
        'Patch operation at index 0 kind must be',
      ),
      json: formattedJson.includes('"command": "validate"'),
    },
    runCliChecks: {
      doctorOutput: capturedOutput.some((line) => line.includes('Zero Runtime doctor')),
      unknownOutput: capturedUnknownOutput.some((line) => line.includes('Zero Runtime CLI')),
    },
  });

  assertStatus(helpResult.status, 'ok');
  assertStatus(initResult.status, 'ok');
  assertStatus(statusResult.status, 'ok');
  assertStatus(doctorResult.status, 'ok');
  assertStatus(inspectResult.status, 'ok');
  assertStatus(validateResult.status, 'ok');
  assertStatus(repairResult.status, 'ok');
  assertStatus(fakeMarkdownRepairResult.status, 'ok');
  assertStatus(staticRepairResult.status, 'ok');
  assertStatus(agentStartResult.status, 'ok');
  assertStatus(agentStatusResult.status, 'ok');
  assertStatus(projectAddResult.status, 'ok');
  assertStatus(projectListResult.status, 'ok');
  assertStatus(projectCurrentResult.status, 'ok');
  assertStatus(projectUseResult.status, 'ok');
  assertStatus(workspaceManagedInspectResult.status, 'ok');
  assertStatus(workspaceManagedValidateResult.status, 'ok');
  assertStatus(workspaceManagedRepairResult.status, 'ok');
  assertStatus(gitStatusCleanResult.status, 'ok');
  assertStatus(gitDoctorCleanResult.status, 'ok');
  assertStatus(gitStatusDirtyResult.status, 'ok');
  assertStatus(gitDiffResult.status, 'ok');
  assertStatus(gitDoctorDirtyResult.status, 'ok');
  assertStatus(gitDoctorAllowDirtyResult.status, 'ok');
  assertStatus(gitAwareRepairResult.status, 'ok');
  assertStatus(patchApplyBlockedWithoutConfirmResult.status, 'error');
  assertStatus(invalidPatchJsonResult.status, 'error');
  assertStatus(invalidPatchShapeResult.status, 'error');
  assertStatus(patchApplyResult.status, 'ok');
  assertStatus(projectRemoveResult.status, 'ok');
  assertStatus(unknownResult.status, 'error');

  if (helpResult.command !== 'help') {
    throw new Error('Expected help command.');
  }

  if (inspectResult.command !== 'inspect') {
    throw new Error('Expected inspect command.');
  }

  if (validateResult.command !== 'validate') {
    throw new Error('Expected validate command.');
  }

  if (repairResult.command !== 'repair') {
    throw new Error('Expected repair command.');
  }

  if (fakeMarkdownRepairResult.command !== 'repair') {
    throw new Error('Expected fake markdown repair command.');
  }

  if (staticRepairResult.command !== 'repair') {
    throw new Error('Expected static repair command.');
  }

  if (agentStartResult.command !== 'agent') {
    throw new Error('Expected agent start command.');
  }

  if (agentStatusResult.command !== 'agent') {
    throw new Error('Expected agent status command.');
  }

  if (projectAddResult.command !== 'project') {
    throw new Error('Expected project command.');
  }

  if (workspaceManagedInspectResult.command !== 'inspect') {
    throw new Error('Expected workspace managed inspect command.');
  }

  if (workspaceManagedValidateResult.command !== 'validate') {
    throw new Error('Expected workspace managed validate command.');
  }

  if (workspaceManagedRepairResult.command !== 'repair') {
    throw new Error('Expected workspace managed repair command.');
  }

  if (gitStatusCleanResult.command !== 'git') {
    throw new Error('Expected git status command.');
  }

  if (gitDiffResult.command !== 'git') {
    throw new Error('Expected git diff command.');
  }

  if (gitDoctorDirtyResult.command !== 'git') {
    throw new Error('Expected git doctor command.');
  }

  if (gitAwareRepairResult.command !== 'repair') {
    throw new Error('Expected git aware repair command.');
  }

  if (patchApplyBlockedWithoutConfirmResult.command !== 'help') {
    throw new Error('Expected blocked patch parse result to fallback to help command.');
  }

  if (invalidPatchJsonResult.command !== 'patch') {
    throw new Error('Expected invalid patch json command to be patch.');
  }

  if (invalidPatchShapeResult.command !== 'patch') {
    throw new Error('Expected invalid patch shape command to be patch.');
  }

  if (patchApplyResult.command !== 'patch') {
    throw new Error('Expected patch apply command.');
  }

  assertIncludes(formattedInspect, 'Zero Runtime inspect');
  assertIncludes(formattedValidate, 'Zero Runtime validate');
  assertIncludes(formattedRepair, 'Zero Runtime repair');

  assertIncludes(formattedFakeMarkdownRepair, 'Zero Runtime repair');
  assertIncludes(formattedFakeMarkdownRepair, 'Model policy:');
  assertIncludes(formattedFakeMarkdownRepair, 'Provider requested: fake-llm');
  assertIncludes(formattedFakeMarkdownRepair, 'Fallback used: no');

  assertIncludes(formattedStaticRepair, 'Zero Runtime repair');
  assertIncludes(formattedStaticRepair, 'Model policy:');
  assertIncludes(formattedStaticRepair, 'Provider requested: static');
  assertIncludes(formattedStaticRepair, 'Fallback used: no');

  assertIncludes(formattedAgentStart, 'Zero Runtime agent');
  assertIncludes(formattedAgentStart, 'Action: start');
  assertIncludes(formattedAgentStart, 'CLI Agent Fixture');

  assertIncludes(formattedAgentStatus, 'Zero Runtime agent');
  assertIncludes(formattedAgentStatus, 'Action: status');

  assertIncludes(formattedDoctor, 'Zero Runtime doctor');
  assertIncludes(formattedProjectList, 'Zero Runtime project');
  assertIncludes(formattedProjectList, 'Managed Target Project');
  assertIncludes(formattedWorkspaceManagedInspect, 'Managed Target Project');
  assertIncludes(formattedWorkspaceManagedValidate, 'Managed Target Project');
  assertIncludes(formattedWorkspaceManagedRepair, targetProjectRoot);

  assertIncludes(formattedGitStatusClean, 'Git status');
  assertIncludes(formattedGitStatusClean, 'Working tree: clean');
  assertIncludes(formattedGitStatusDirty, 'Working tree: dirty');
  assertIncludes(formattedGitStatusDirty, 'tracked.txt');
  assertIncludes(formattedGitStatusDirty, 'untracked.txt');
  assertIncludes(formattedGitDiff, 'Git diff');
  assertIncludes(formattedGitDiff, 'changed content');
  assertIncludes(formattedGitDoctorDirty, 'Git change boundary');
  assertIncludes(formattedGitDoctorDirty, 'Decision: blocked');
  assertIncludes(formattedGitDoctorAllowDirty, 'Decision: warning');

  assertIncludes(formattedGitAwareRepair, 'Zero Runtime repair');
  assertIncludes(formattedGitAwareRepair, 'Git boundary');
  assertIncludes(formattedGitAwareRepair, 'Working tree: dirty');
  assertIncludes(formattedGitAwareRepair, 'Guard decision: blocked');
  assertIncludes(formattedGitAwareRepair, 'tracked.txt');
  assertIncludes(formattedGitAwareRepair, 'untracked.txt');

  assertIncludes(formattedPatchApply, 'Zero Runtime patch apply');
  assertIncludes(formattedPatchApply, 'Status: applied');
  assertIncludes(formattedPatchApply, 'Proposal: cli-patch-apply-proposal');
  assertIncludes(formattedPatchApply, 'src/patch-target.ts');
  assertIncludes(formattedPatchApply, 'Backup:');

  assertIncludes(formattedInvalidPatchJson, 'Invalid patch proposal JSON');
  assertIncludes(formattedInvalidPatchShape, 'Patch operation at index 0 kind must be');

  assertIncludes(formattedJson, '"command": "validate"');

  assertNotJsonText(formattedInspect, 'inspect');
  assertNotJsonText(formattedValidate, 'validate');
  assertNotJsonText(formattedRepair, 'repair');
  assertNotJsonText(formattedFakeMarkdownRepair, 'fake-markdown-repair');
  assertNotJsonText(formattedStaticRepair, 'static-repair');
  assertNotJsonText(formattedAgentStart, 'agent-start');
  assertNotJsonText(formattedAgentStatus, 'agent-status');
  assertNotJsonText(formattedDoctor, 'doctor');
  assertNotJsonText(formattedProjectList, 'project');
  assertNotJsonText(formattedWorkspaceManagedInspect, 'workspace-managed-inspect');
  assertNotJsonText(formattedWorkspaceManagedValidate, 'workspace-managed-validate');
  assertNotJsonText(formattedWorkspaceManagedRepair, 'workspace-managed-repair');
  assertNotJsonText(formattedGitStatusClean, 'git-status-clean');
  assertNotJsonText(formattedGitStatusDirty, 'git-status-dirty');
  assertNotJsonText(formattedGitDiff, 'git-diff');
  assertNotJsonText(formattedGitDoctorDirty, 'git-doctor-dirty');
  assertNotJsonText(formattedGitDoctorAllowDirty, 'git-doctor-allow-dirty');
  assertNotJsonText(formattedGitAwareRepair, 'git-aware-repair');
  assertNotJsonText(formattedPatchApply, 'patch-apply');

  logger.info('Session 40.A CLI agent command smoke test passed');
}

async function resetGitFixture(repoRoot: string): Promise<void> {
  await rm(repoRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(repoRoot, {
    recursive: true,
  });

  await execFileAsync('git', ['init', '-b', 'test-branch'], {
    cwd: repoRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'user.email', 'zero-runtime@example.local'], {
    cwd: repoRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'user.name', 'Zero Runtime Test'], {
    cwd: repoRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'core.autocrlf', 'false'], {
    cwd: repoRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['config', 'core.eol', 'lf'], {
    cwd: repoRoot,
    windowsHide: true,
  });

  await writeFile(resolve(repoRoot, '.gitattributes'), '* text eol=lf\n', 'utf8');
  await writeFile(resolve(repoRoot, 'tracked.txt'), 'initial content\n', 'utf8');

  await execFileAsync('git', ['add', '.gitattributes', 'tracked.txt'], {
    cwd: repoRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['commit', '-m', 'initial commit'], {
    cwd: repoRoot,
    windowsHide: true,
  });
}

async function resetPatchApplyFixture(projectRoot: string): Promise<void> {
  await rm(projectRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(resolve(projectRoot, 'src'), {
    recursive: true,
  });

  await writeFile(
    resolve(projectRoot, 'src/patch-target.ts'),
    'export const patched = false;\n',
    'utf8',
  );

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

  await execFileAsync('git', ['add', '.gitattributes', 'src/patch-target.ts'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['commit', '-m', 'initial commit'], {
    cwd: projectRoot,
    windowsHide: true,
  });
}

async function captureConsoleOutput(action: () => Promise<void>): Promise<string[]> {
  const originalLog = console.log;
  const output: string[] = [];

  console.log = (...args: unknown[]): void => {
    output.push(args.map((arg) => String(arg)).join(' '));
  };

  try {
    await action();
    return output;
  } finally {
    console.log = originalLog;
  }
}

async function withTemporaryCwd<TValue>(
  directory: string,
  action: () => Promise<TValue>,
): Promise<TValue> {
  const previousCwd = process.cwd();

  process.chdir(directory);

  try {
    return await action();
  } finally {
    process.chdir(previousCwd);
  }
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

function assertNotJsonText(value: string, commandName: string): void {
  if (value.trim().startsWith('{')) {
    throw new Error(`Expected ${commandName} text output to be human-readable, not JSON.`);
  }
}

main().catch((error: unknown) => {
  logger.error('CLI test failed', {
    error: error instanceof Error ? error.message : String(error),
  });

  process.exitCode = 1;
});
