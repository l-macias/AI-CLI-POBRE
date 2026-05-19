import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { PatchApplyRunner } from '../patch-apply/PatchApplyRunner.js';
import { PatchSafetyValidator } from '../repair/PatchSafetyValidator.js';
import type { PatchProposal, RepairRequest } from '../types/RepairTypes.js';

const execFileAsync = promisify(execFile);

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const fixtureRoot = path.resolve('.runtime/security-protected-path-integration-test');
  const projectRoot = path.join(fixtureRoot, 'project');
  const outsideRoot = path.join(fixtureRoot, 'outside');

  await resetGitFixture(projectRoot, outsideRoot);

  const runner = new PatchApplyRunner();

  const traversalProposal: PatchProposal = {
    id: 'security-traversal-proposal',
    summary: 'Attempt traversal.',
    riskLevel: 'high',
    operations: [
      {
        kind: 'replace_file',
        targetFile: '../outside/secret.txt',
        newContent: 'owned\n',
        reason: 'Malicious traversal attempt.',
      },
    ],
    explanation: 'This must be blocked.',
  };

  const traversalResult = await runner.run({
    projectRoot,
    proposal: traversalProposal,
    applyConfirmed: true,
    allowDirtyWorkingTree: true,
  });

  assert(traversalResult.status === 'blocked', 'Traversal patch must be blocked.');
  assert(
    traversalResult.issues.some((issue) => issue.code === 'PATCH_APPLY_PATH_TRAVERSAL'),
    'Traversal patch should produce traversal issue.',
  );

  const outsideContent = await readFile(path.join(outsideRoot, 'secret.txt'), 'utf8');

  assert(outsideContent === 'outside secret\n', 'Traversal patch must not modify outside file.');

  const absoluteProposal: PatchProposal = {
    id: 'security-absolute-path-proposal',
    summary: 'Attempt absolute path.',
    riskLevel: 'high',
    operations: [
      {
        kind: 'replace_file',
        targetFile: path.join(projectRoot, 'src/index.ts'),
        newContent: 'export const value = 99;\n',
        reason: 'Absolute path attempt.',
      },
    ],
    explanation: 'This must be blocked.',
  };

  const absoluteResult = await runner.run({
    projectRoot,
    proposal: absoluteProposal,
    applyConfirmed: true,
    allowDirtyWorkingTree: true,
  });

  assert(absoluteResult.status === 'blocked', 'Absolute path patch must be blocked.');
  assert(
    absoluteResult.issues.some((issue) => issue.code === 'PATCH_APPLY_ABSOLUTE_PATH_BLOCKED'),
    'Absolute path patch should produce absolute path issue.',
  );

  const envProposal: PatchProposal = {
    id: 'security-env-proposal',
    summary: 'Attempt env write.',
    riskLevel: 'high',
    operations: [
      {
        kind: 'replace_file',
        targetFile: '.env',
        newContent: 'SECRET=leak\n',
        reason: 'Malicious secret file write.',
      },
    ],
    explanation: 'This must be blocked.',
  };

  const envResult = await runner.run({
    projectRoot,
    proposal: envProposal,
    applyConfirmed: true,
    allowDirtyWorkingTree: true,
  });

  assert(envResult.status === 'blocked', '.env patch must be blocked.');
  assert(
    envResult.issues.some((issue) => {
      return (
        issue.code === 'PATCH_APPLY_SECRET_FILE_BLOCKED' ||
        issue.code === 'PATCH_APPLY_PROTECTED_PATH_BLOCKED'
      );
    }),
    '.env patch should produce protected/secret path issue.',
  );

  let symlinkCheckSkipped = false;

  try {
    await symlink(
      outsideRoot,
      path.join(projectRoot, 'src/linked-outside'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );

    const symlinkProposal: PatchProposal = {
      id: 'security-symlink-proposal',
      summary: 'Attempt symlink escape.',
      riskLevel: 'high',
      operations: [
        {
          kind: 'replace_file',
          targetFile: 'src/linked-outside/secret.txt',
          newContent: 'owned through symlink\n',
          reason: 'Malicious symlink traversal attempt.',
        },
      ],
      explanation: 'This must be blocked.',
    };

    const symlinkResult = await runner.run({
      projectRoot,
      proposal: symlinkProposal,
      applyConfirmed: true,
      allowDirtyWorkingTree: true,
    });

    assert(symlinkResult.status === 'blocked', 'Symlink patch must be blocked.');
    assert(
      symlinkResult.issues.some((issue) => issue.code === 'PATCH_APPLY_SYMLINK_BLOCKED'),
      'Symlink patch should produce symlink issue.',
    );

    const symlinkOutsideContent = await readFile(path.join(outsideRoot, 'secret.txt'), 'utf8');

    assert(
      symlinkOutsideContent === 'outside secret\n',
      'Symlink patch must not modify outside file.',
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      process.platform === 'win32' &&
      (message.includes('EPERM') || message.includes('privilege'))
    ) {
      symlinkCheckSkipped = true;
    } else {
      throw error;
    }
  }

  const safeProposal: PatchProposal = {
    id: 'security-safe-proposal',
    summary: 'Safe source edit.',
    riskLevel: 'low',
    operations: [
      {
        kind: 'replace_file',
        targetFile: 'src/index.ts',
        newContent: 'export const value = 2;\n',
        expectedCurrentContent: 'export const value = 1;\n',
        reason: 'Safe controlled edit.',
      },
    ],
    explanation: 'This should be allowed.',
  };

  const safeResult = await runner.run({
    projectRoot,
    proposal: safeProposal,
    applyConfirmed: true,
    allowDirtyWorkingTree: true,
  });

  assert(safeResult.status === 'applied', 'Safe source patch should still apply.');

  const safeContent = await readFile(path.join(projectRoot, 'src/index.ts'), 'utf8');

  assert(
    safeContent === 'export const value = 2;\n',
    'Safe source patch should modify target file.',
  );

  const validator = new PatchSafetyValidator();

  const repairRequest: RepairRequest = {
    id: 'security-repair-request',
    objective: 'Test repair safety.',
    projectRoot,
    targetFiles: [
      {
        relativePath: 'src/index.ts',
        exists: true,
        content: safeContent,
        bytes: Buffer.byteLength(safeContent),
      },
    ],
    findings: [],
    constraints: [],
    expectedOutput: {
      format: 'json_patch_proposal',
      allowedOperations: ['replace_file', 'edit_file'],
      requireExplanation: true,
      requireRiskAssessment: true,
    },
  };

  const repairTraversalValidation = validator.validate({
    request: repairRequest,
    proposal: traversalProposal,
  });

  assert(
    !repairTraversalValidation.valid,
    'Repair safety validator must reject traversal proposal.',
  );
  assert(
    repairTraversalValidation.issues.some((issue) => issue.code === 'PATCH_TARGET_PATH_TRAVERSAL'),
    'Repair safety validator should produce traversal issue.',
  );

  console.info(
    JSON.stringify(
      {
        status: 'ok',
        test: 'security-protected-path-integration-test',
        symlinkCheckSkipped,
      },
      null,
      2,
    ),
  );
}

async function resetGitFixture(projectRoot: string, outsideRoot: string): Promise<void> {
  const fixtureRoot = path.dirname(projectRoot);

  await rm(fixtureRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(path.join(projectRoot, 'src'), {
    recursive: true,
  });

  await mkdir(outsideRoot, {
    recursive: true,
  });

  await writeFile(path.join(projectRoot, 'src/index.ts'), 'export const value = 1;\n', 'utf8');
  await writeFile(path.join(outsideRoot, 'secret.txt'), 'outside secret\n', 'utf8');

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

  await execFileAsync('git', ['add', '.gitattributes', 'src/index.ts'], {
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
        test: 'security-protected-path-integration-test',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});
