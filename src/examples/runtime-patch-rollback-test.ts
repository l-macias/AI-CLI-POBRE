import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { PatchDiffBuilder } from '../diff/PatchDiffBuilder.js';
import { RuntimePatchApplyBridge } from '../patches/RuntimePatchApplyBridge.js';
import { RuntimePatchRollback } from '../patches/RuntimePatchRollback.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';

const execFileAsync = promisify(execFile);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function resetGitFixture(projectRoot: string): Promise<void> {
  await rm(projectRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(path.join(projectRoot, 'src'), {
    recursive: true,
  });

  await writeFile(path.join(projectRoot, 'src', 'example.ts'), 'export const value = 1;\n', 'utf8');

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

  await writeFile(path.join(projectRoot, '.gitattributes'), '* text eol=lf\n', 'utf8');

  await execFileAsync('git', ['add', '.'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['commit', '-m', 'initial commit'], {
    cwd: projectRoot,
    windowsHide: true,
  });
}

const testRoot = path.resolve('.runtime/runtime-patch-rollback-test');
const projectRoot = path.join(testRoot, 'project');

await resetGitFixture(projectRoot);

const currentContent = await readFile(path.join(projectRoot, 'src', 'example.ts'), 'utf8');

const proposal: RuntimePatchProposal = {
  id: 'runtime-patch-rollback-proposal',
  planId: 'runtime-plan-rollback-test',
  sessionId: 'session-88-runtime-patch-rollback-test',
  projectRoot,
  summary: 'Apply and rollback controlled example patch.',
  files: [
    {
      path: 'src/example.ts',
      operation: 'modify',
      beforeHash: hashContent(currentContent),
      content: 'export const value = 2;\n',
      reason: 'The runtime patch updates the selected example file after diff preview.',
      changesSummary: ['Updates the selected example file before rollback validation.'],
      riskLevel: 'low',
      userSelectable: true,
    },
  ],
  risks: [
    {
      code: 'LOW_RISK_PATCH_PROPOSAL',
      level: 'low',
      message: 'Patch proposal is limited to a non-sensitive file.',
      mitigation: 'Require diff preview and explicit approval before apply.',
    },
  ],
  verifyCommands: [
    {
      command: 'npm',
      args: ['run', 'typecheck'],
      reason: 'Validate TypeScript after reviewed changes.',
      requiresApproval: true,
    },
  ],
  riskLevel: 'low',
  requiresApproval: true,
  status: 'validated',
  createdAt: new Date().toISOString(),
};

const diff = new PatchDiffBuilder().build({
  proposal,
}).diff;

const applyBridge = new RuntimePatchApplyBridge();

const applyResult = await applyBridge.apply({
  proposal,
  diff,
  applyConfirmed: true,
  allowDirtyWorkingTree: false,
  backupEnabled: true,
});

assert(applyResult.status === 'applied', 'Expected patch apply to succeed.');

const appliedContent = await readFile(path.join(projectRoot, 'src', 'example.ts'), 'utf8');

assert(appliedContent === 'export const value = 2;\n', 'Expected patch content to be applied.');

const rollback = new RuntimePatchRollback();

const blockedRollback = await rollback.rollback({
  applyResult,
  rollbackConfirmed: false,
});

assert(blockedRollback.status === 'blocked', 'Rollback without confirmation must be blocked.');
assert(
  blockedRollback.issues.some((issue) => issue.code === 'PATCH_ROLLBACK_CONFIRMATION_REQUIRED'),
  'Expected rollback confirmation issue.',
);

const dryRunRollback = await rollback.rollback({
  applyResult,
  rollbackConfirmed: false,
  dryRun: true,
});

assert(dryRunRollback.status === 'dry_run', 'Expected rollback dry run.');

const stillAppliedContent = await readFile(path.join(projectRoot, 'src', 'example.ts'), 'utf8');

assert(stillAppliedContent === 'export const value = 2;\n', 'Rollback dry run must not write.');

const rollbackResult = await rollback.rollback({
  applyResult,
  rollbackConfirmed: true,
});

assert(rollbackResult.status === 'rolled_back', 'Expected rollback to restore previous content.');
assert(rollbackResult.operationResults.length === 1, 'Expected one rollback operation.');
assert(
  rollbackResult.operationResults[0]?.status === 'restored',
  'Expected rollback operation to restore file.',
);

const restoredContent = await readFile(path.join(projectRoot, 'src', 'example.ts'), 'utf8');

assert(
  restoredContent === 'export const value = 1;\n',
  'Expected original content after rollback.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-patch-rollback-test',
      applyStatus: applyResult.status,
      blockedRollbackStatus: blockedRollback.status,
      dryRunRollbackStatus: dryRunRollback.status,
      rollbackStatus: rollbackResult.status,
      rollbackOperations: rollbackResult.operationResults.length,
    },
    null,
    2,
  ),
);
