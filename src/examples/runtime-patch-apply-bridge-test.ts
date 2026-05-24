import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { PatchDiffBuilder } from '../diff/PatchDiffBuilder.js';
import { RuntimePatchApplyBridge } from '../patches/RuntimePatchApplyBridge.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';

const execFileAsync = promisify(execFile);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectReject(input: {
  action: () => Promise<unknown>;
  messageIncludes: string;
}): Promise<void> {
  try {
    await input.action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    assert(
      message.includes(input.messageIncludes),
      `Expected error containing "${input.messageIncludes}", got "${message}".`,
    );

    return;
  }

  throw new Error(`Expected rejection containing "${input.messageIncludes}".`);
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

  await execFileAsync('git', ['add', '.gitattributes', 'src/example.ts'], {
    cwd: projectRoot,
    windowsHide: true,
  });

  await execFileAsync('git', ['commit', '-m', 'initial commit'], {
    cwd: projectRoot,
    windowsHide: true,
  });
}

const testRoot = path.resolve('.runtime/runtime-patch-apply-bridge-test');
const projectRoot = path.join(testRoot, 'project');

await resetGitFixture(projectRoot);

const currentContent = await readFile(path.join(projectRoot, 'src', 'example.ts'), 'utf8');

const proposal: RuntimePatchProposal = {
  id: 'runtime-patch-apply-bridge-proposal',
  planId: 'runtime-plan-apply-bridge-test',
  sessionId: 'session-87-runtime-patch-apply-bridge-test',
  projectRoot,
  summary: 'Apply controlled profile example patch.',
  files: [
    {
      path: 'src/example.ts',
      operation: 'modify',
      beforeHash: hashContent(currentContent),
      content: 'export const value = 2;\n',
      reason: 'The runtime patch updates the selected example file after diff preview.',
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

const bridge = new RuntimePatchApplyBridge();

const dryRun = await bridge.apply({
  proposal,
  diff,
  applyConfirmed: false,
  dryRun: true,
  allowDirtyWorkingTree: false,
});

assert(dryRun.status === 'dry_run', 'Expected dry run status.');

const dryRunContent = await readFile(path.join(projectRoot, 'src', 'example.ts'), 'utf8');

assert(dryRunContent === 'export const value = 1;\n', 'Dry run must not write files.');

await expectReject({
  action: () =>
    bridge.apply({
      proposal,
      diff,
      applyConfirmed: false,
      allowDirtyWorkingTree: false,
    }),
  messageIncludes: 'explicit apply confirmation',
});

const applied = await bridge.apply({
  proposal,
  diff,
  applyConfirmed: true,
  allowDirtyWorkingTree: false,
});

assert(applied.status === 'applied', 'Expected confirmed runtime patch to apply.');

const appliedContent = await readFile(path.join(projectRoot, 'src', 'example.ts'), 'utf8');

assert(appliedContent === 'export const value = 2;\n', 'Expected patch content to be written.');

const backup = applied.operationResults[0]?.backup;

assert(backup?.backupPath, 'Expected backup path.');
assert(
  (await readFile(backup.backupPath, 'utf8')) === 'export const value = 1;\n',
  'Expected backup to contain original content.',
);

const rejectedProposal: RuntimePatchProposal = {
  ...proposal,
  status: 'rejected',
};

await expectReject({
  action: () =>
    bridge.apply({
      proposal: rejectedProposal,
      diff,
      applyConfirmed: true,
      allowDirtyWorkingTree: true,
    }),
  messageIncludes: 'validated patch proposal',
});

const mismatchedDiff = {
  ...diff,
  proposalId: 'different-proposal-id',
};

await expectReject({
  action: () =>
    bridge.apply({
      proposal,
      diff: mismatchedDiff,
      applyConfirmed: true,
      allowDirtyWorkingTree: true,
    }),
  messageIncludes: 'same proposal',
});

const mediumRiskProposal: RuntimePatchProposal = {
  ...proposal,
  id: 'runtime-patch-apply-bridge-medium-risk-proposal',
  riskLevel: 'medium',
};

const mediumRiskDiff = new PatchDiffBuilder().build({
  proposal: mediumRiskProposal,
}).diff;

await expectReject({
  action: () =>
    bridge.apply({
      proposal: mediumRiskProposal,
      diff: mediumRiskDiff,
      applyConfirmed: true,
      allowDirtyWorkingTree: true,
    }),
  messageIncludes: 'requires a snapshot id',
});

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-patch-apply-bridge-test',
      dryRun: dryRun.status,
      applied: applied.status,
      proposalId: proposal.id,
      backupPath: backup.backupPath,
      operationResults: applied.operationResults.length,
    },
    null,
    2,
  ),
);
