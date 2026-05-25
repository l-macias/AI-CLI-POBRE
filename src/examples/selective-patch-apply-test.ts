import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { ApprovedPatchBuilder } from '../patches/ApprovedPatchBuilder.js';
import { PatchDiffBuilder } from '../diff/PatchDiffBuilder.js';
import { RuntimePatchApplyBridge } from '../patches/RuntimePatchApplyBridge.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

const projectRoot = resolve('.runtime/selective-patch-apply-test/project');

await rm(resolve('.runtime/selective-patch-apply-test'), {
  recursive: true,
  force: true,
});

await mkdir(resolve(projectRoot, 'src'), {
  recursive: true,
});

const originalA = 'export const a = 1;\n';
const originalB = 'export const b = 1;\n';

await writeFile(resolve(projectRoot, 'src/a.ts'), originalA, 'utf8');
await writeFile(resolve(projectRoot, 'src/b.ts'), originalB, 'utf8');

const proposal: RuntimePatchProposal = {
  id: 'proposal-selective-apply-test',
  planId: 'plan-selective-apply-test',
  sessionId: 'session-selective-apply-test',
  projectRoot,
  summary: 'Selective patch apply test proposal.',
  files: [
    {
      path: 'src/a.ts',
      operation: 'modify',
      beforeHash: hashContent(originalA),
      content: 'export const a = 2;\n',
      reason: 'Update file A for selective apply test.',
      changesSummary: ['Updates file A from value 1 to value 2.'],
      riskLevel: 'medium',
      userSelectable: true,
    },
    {
      path: 'src/b.ts',
      operation: 'modify',
      beforeHash: hashContent(originalB),
      content: 'export const b = 2;\n',
      reason: 'Update file B for selective apply test.',
      changesSummary: ['Updates file B from value 1 to value 2.'],
      riskLevel: 'medium',
      userSelectable: true,
    },
  ],
  risks: [
    {
      code: 'MULTI_FILE_PATCH',
      level: 'medium',
      message: 'Patch proposal affects multiple files.',
      mitigation: 'Use selective file approval before apply.',
    },
  ],
  verifyCommands: [
    {
      command: 'npm',
      args: ['run', 'typecheck'],
      reason: 'Validate TypeScript after selective apply.',
      requiresApproval: true,
    },
  ],
  riskLevel: 'medium',
  requiresApproval: true,
  status: 'validated',
  createdAt: '2026-05-25T00:00:00.000Z',
};

const selectedFilePaths = ['src/a.ts'];

const approvedPatchBuilder = new ApprovedPatchBuilder();

const firstApprovedPatch = approvedPatchBuilder.build({
  proposal,
  selectedFilePaths,
});

const secondApprovedPatch = approvedPatchBuilder.build({
  proposal,
  selectedFilePaths,
});

assert(
  firstApprovedPatch.proposal.id === secondApprovedPatch.proposal.id,
  'Expected filtered proposal id to be deterministic for the same selected files.',
);

assert(
  firstApprovedPatch.originalProposalId === proposal.id,
  'Expected original proposal id traceability.',
);

assert(
  firstApprovedPatch.selectedFilePaths.length === 1 &&
    firstApprovedPatch.selectedFilePaths[0] === 'src/a.ts',
  'Expected only src/a.ts to be selected.',
);

assert(
  firstApprovedPatch.rejectedFilePaths.length === 1 &&
    firstApprovedPatch.rejectedFilePaths[0] === 'src/b.ts',
  'Expected src/b.ts to be rejected.',
);

assert(
  firstApprovedPatch.proposal.files.length === 1 &&
    firstApprovedPatch.proposal.files[0]?.path === 'src/a.ts',
  'Expected filtered proposal to include only src/a.ts.',
);

const diffBuilder = new PatchDiffBuilder();

const diffResult = diffBuilder.build({
  proposal: firstApprovedPatch.proposal,
});

assert(
  diffResult.diff.proposalId === firstApprovedPatch.proposal.id,
  'Expected diff proposalId to match filtered proposal id.',
);

assert(diffResult.diff.files.length === 1, 'Expected diff to include one file.');
assert(diffResult.diff.files[0]?.path === 'src/a.ts', 'Expected diff to include src/a.ts.');

const applyBridge = new RuntimePatchApplyBridge();

const dryRunResult = await applyBridge.apply({
  proposal: secondApprovedPatch.proposal,
  diff: diffResult.diff,
  applyConfirmed: false,
  dryRun: true,
  allowDirtyWorkingTree: true,
  allowMissingRepository: true,
  backupEnabled: false,
});

assert(dryRunResult.status === 'dry_run', 'Expected dry-run selective apply result.');
assert(
  dryRunResult.operationResults.length === 1,
  'Expected dry-run to include only selected file operation.',
);
assert(
  dryRunResult.operationResults[0]?.targetFile === 'src/a.ts',
  'Expected dry-run operation to target src/a.ts.',
);

const applyResult = await applyBridge.apply({
  proposal: secondApprovedPatch.proposal,
  diff: diffResult.diff,
  applyConfirmed: true,
  snapshotId: 'snapshot-selective-apply-test',
  allowDirtyWorkingTree: true,
  allowMissingRepository: true,
  backupEnabled: false,
});

assert(applyResult.status === 'applied', 'Expected selective apply to be applied.');
assert(
  applyResult.operationResults.length === 1,
  'Expected real apply to include only selected file operation.',
);
assert(
  applyResult.operationResults[0]?.targetFile === 'src/a.ts',
  'Expected real apply operation to target src/a.ts.',
);

const finalA = await readFile(resolve(projectRoot, 'src/a.ts'), 'utf8');
const finalB = await readFile(resolve(projectRoot, 'src/b.ts'), 'utf8');

assert(finalA === 'export const a = 2;\n', 'Expected selected file src/a.ts to be modified.');
assert(finalB === originalB, 'Expected rejected file src/b.ts to remain unchanged.');

console.log(
  JSON.stringify(
    {
      message: 'Selective patch apply test completed',
      originalProposalId: proposal.id,
      filteredProposalId: firstApprovedPatch.proposal.id,
      selectedFilePaths: firstApprovedPatch.selectedFilePaths,
      rejectedFilePaths: firstApprovedPatch.rejectedFilePaths,
      dryRunStatus: dryRunResult.status,
      applyStatus: applyResult.status,
    },
    null,
    2,
  ),
);
