import { rm } from 'node:fs/promises';
import path from 'node:path';
import { PatchDiffBuilder } from '../diff/PatchDiffBuilder.js';
import { PatchDiffStorage } from '../diff/PatchDiffStorage.js';
import type { RuntimePatchProposal } from '../patches/PatchProposal.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/patch-diff-builder-test');

await rm(testRoot, {
  recursive: true,
  force: true,
});

const proposal: RuntimePatchProposal = {
  id: 'patch-proposal-session-86-test',
  planId: 'runtime-plan-session-86-test',
  sessionId: 'session-86-patch-diff-test',
  projectRoot: testRoot,
  summary: 'Preview profile UI patch.',
  files: [
    {
      path: 'src/components/ProfileCard.tsx',
      operation: 'modify',
      beforeHash: 'old-hash',
      content:
        'export function ProfileCard() {\n  return <section>Improved Profile</section>;\n}\n',
      reason: 'ProfileCard is the selected target for the patch proposal.',
      changesSummary: ['Updates the selected ProfileCard component for diff preview testing.'],
      riskLevel: 'low',
      userSelectable: true,
    },
    {
      path: 'src/api/profileApi.ts',
      operation: 'create',
      beforeHash: null,
      content: 'export async function getProfile() {\n  return fetch("/api/profile");\n}\n',
      reason: 'Profile API client is required by the proposed UI workflow.',
      changesSummary: ['Creates the Profile API client required by the proposed workflow.'],
      riskLevel: 'low',
      userSelectable: true,
    },
  ],
  risks: [
    {
      code: 'LOW_RISK_PATCH_PROPOSAL',
      level: 'low',
      message: 'Patch proposal is limited to non-sensitive files.',
      mitigation: 'Require diff preview and approval before apply.',
    },
  ],
  verifyCommands: [
    {
      command: 'npm',
      args: ['run', 'typecheck'],
      reason: 'Validate TypeScript correctness after reviewed changes.',
      requiresApproval: true,
    },
  ],
  riskLevel: 'low',
  requiresApproval: true,
  status: 'validated',
  createdAt: new Date().toISOString(),
};

const builder = new PatchDiffBuilder();
const storage = new PatchDiffStorage();

const result = builder.build({
  proposal,
});

assert(result.diff.id.startsWith('patch-diff-'), 'Expected patch diff id.');
assert(result.diff.proposalId === proposal.id, 'Expected proposal id link.');
assert(result.diff.files.length === 2, 'Expected two diff files.');
assert(result.diff.summary.filesChanged === 2, 'Expected two changed files.');
assert(result.diff.summary.additions > 0, 'Expected additions.');
assert(result.diff.safeToPreview, 'Expected diff safe to preview.');

const modifiedFile = result.diff.files.find(
  (file) => file.path === 'src/components/ProfileCard.tsx',
);

assert(modifiedFile !== undefined, 'Expected modified file diff.');
assert(modifiedFile.status === 'modified', 'Expected modified file status.');
assert(modifiedFile.afterHash !== null, 'Expected after hash for modified file.');

const createdFile = result.diff.files.find((file) => file.path === 'src/api/profileApi.ts');

assert(createdFile !== undefined, 'Expected created file diff.');
assert(createdFile.status === 'added', 'Expected added file status.');
assert(createdFile.beforeContent === null, 'Expected created file beforeContent null.');

const saved = await storage.save(result);

assert(saved.diffPath.endsWith('.json'), 'Expected diff json path.');
assert(saved.activeDiffPath.endsWith('active-patch-diff.json'), 'Expected active diff path.');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'patch-diff-builder-test',
      diffId: result.diff.id,
      proposalId: result.diff.proposalId,
      filesChanged: result.diff.summary.filesChanged,
      additions: result.diff.summary.additions,
      deletions: result.diff.summary.deletions,
      diffPath: saved.diffPath,
      activeDiffPath: saved.activeDiffPath,
    },
    null,
    2,
  ),
);
