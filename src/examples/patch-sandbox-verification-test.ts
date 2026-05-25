import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PatchSandbox } from '../sandbox/PatchSandbox.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}
function required<TValue>(value: TValue | null | undefined, message: string): TValue {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}
function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

const runtimeRoot = '.runtime/patch-sandbox-verification-test';
const projectRoot = resolve(runtimeRoot, 'project');

await rm(runtimeRoot, {
  recursive: true,
  force: true,
});

await mkdir(resolve(projectRoot, 'src'), {
  recursive: true,
});

const originalContent = 'export const value = 1;\n';
const nextContent = 'export const value = 2;\n';

await writeFile(
  resolve(projectRoot, 'package.json'),
  `${JSON.stringify(
    {
      scripts: {
        typecheck: 'echo sandbox typecheck ok',
      },
    },
    null,
    2,
  )}\n`,
  'utf8',
);

await writeFile(
  resolve(projectRoot, 'tsconfig.json'),
  `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        noEmit: true,
      },
      include: ['src/**/*.ts'],
    },
    null,
    2,
  )}\n`,
  'utf8',
);

await writeFile(resolve(projectRoot, 'src/value.ts'), originalContent, 'utf8');

const proposal: RuntimePatchProposal = {
  id: 'proposal-patch-sandbox-verification-test',
  planId: 'plan-patch-sandbox-verification-test',
  sessionId: 'session-patch-sandbox-verification-test',
  projectRoot,
  summary: 'Validate patch sandbox verification.',
  files: [
    {
      path: 'src/value.ts',
      operation: 'modify',
      beforeHash: hashContent(originalContent),
      content: nextContent,
      reason: 'Update value file for patch sandbox verification test.',
      changesSummary: ['Updates value from 1 to 2 inside sandbox.'],
      riskLevel: 'low',
      userSelectable: true,
    },
  ],
  risks: [
    {
      code: 'LOW_RISK_PATCH_PROPOSAL',
      level: 'low',
      message: 'Patch proposal is limited to low-impact non-sensitive files.',
      mitigation: 'Still require diff preview and user approval before apply.',
    },
  ],
  verifyCommands: [
    {
      command: 'npm',
      args: ['run', 'typecheck'],
      reason: 'Validate TypeScript in sandbox after patch apply.',
      requiresApproval: true,
    },
  ],
  riskLevel: 'low',
  requiresApproval: true,
  status: 'validated',
  createdAt: '2026-05-25T00:00:00.000Z',
};

const sandbox = new PatchSandbox({
  cleanup: false,
});

const result = await sandbox.verify({
  proposal,
  verifyCommands: proposal.verifyCommands,
  approvalState: 'approved',
});

assert(result.status === 'passed', `Expected sandbox verification to pass, got ${result.status}.`);

const workspace = required(result.workspace, 'Expected sandbox workspace to be created.');
const applyResult = required(result.applyResult, 'Expected sandbox patch apply result.');

assert(applyResult.status === 'applied', 'Expected sandbox patch apply to be applied.');
assert(result.verifyRuns.length === 1, 'Expected one sandbox verify run.');
assert(result.verifyRuns[0]?.status === 'executed', 'Expected verify command to execute.');
assert(result.verifyRuns[0]?.exitCode === 0, 'Expected verify command to exit with 0.');

const originalProjectContent = await readFile(resolve(projectRoot, 'src/value.ts'), 'utf8');
const sandboxProjectContent = await readFile(
  resolve(workspace.workspaceRoot, 'src/value.ts'),
  'utf8',
);

assert(
  originalProjectContent === originalContent,
  'Expected original project file to remain unchanged.',
);

assert(
  sandboxProjectContent === nextContent,
  'Expected sandbox workspace file to contain patched content.',
);

console.log(
  JSON.stringify(
    {
      message: 'Patch sandbox verification test completed',
      status: result.status,
      sandboxId: workspace.sandboxId,
      workspaceRoot: workspace.workspaceRoot,
      applyStatus: applyResult.status,
      verifyRuns: result.verifyRuns.map((run) => ({
        command: run.command,
        status: run.status,
        exitCode: run.exitCode,
        stderrSummary: run.stderrSummary,
      })),
      originalProjectContent,
      sandboxProjectContent,
    },
    null,
    2,
  ),
);
