import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ApprovalDecisionStore } from '../approval/ApprovalDecisionStore.js';
import type { ApprovalDecisionResult } from '../approval/ApprovalRequest.js';
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

function required<TValue>(value: TValue | null | undefined, message: string): TValue {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}

const runtimeRoot = '.runtime/persisted-patch-apply-authorization-test';
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

await writeFile(resolve(projectRoot, 'src/value.ts'), originalContent, 'utf8');

const proposal: RuntimePatchProposal = {
  id: 'proposal-persisted-authorization-test',
  planId: 'plan-persisted-authorization-test',
  sessionId: 'session-persisted-authorization-test',
  projectRoot,
  summary: 'Validate persisted patch apply authorization.',
  files: [
    {
      path: 'src/value.ts',
      operation: 'modify',
      beforeHash: hashContent(originalContent),
      content: nextContent,
      reason: 'Update value file for persisted authorization test.',
      changesSummary: ['Updates value from 1 to 2.'],
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
      reason: 'Validate TypeScript after persisted authorization test.',
      requiresApproval: true,
    },
  ],
  riskLevel: 'low',
  requiresApproval: true,
  status: 'validated',
  createdAt: '2026-05-25T00:00:00.000Z',
};

const diff = new PatchDiffBuilder().build({
  proposal,
}).diff;

const store = new ApprovalDecisionStore();

const decision: ApprovalDecisionResult = {
  requestId: `approval-patch-${proposal.id}`,
  action: 'approve',
  accepted: true,
  selectedFilePaths: ['src/value.ts'],
  decidedAt: '2026-05-25T00:00:00.000Z',
};

await store.save({
  sessionId: proposal.sessionId,
  projectRoot: proposal.projectRoot,
  proposalId: proposal.id,
  diffId: diff.id,
  decision,
});

const persisted = required(
  await store.findLatest({
    sessionId: proposal.sessionId,
    proposalId: proposal.id,
    diffId: diff.id,
  }),
  'Expected persisted approval decision.',
);

assert(persisted.decision.accepted, 'Expected persisted approval decision to be accepted.');

assert(
  persisted.decision.selectedFilePaths[0] === 'src/value.ts',
  'Expected persisted approval selected file.',
);

const applyBridge = new RuntimePatchApplyBridge();

const dryRunWithoutAuthorization = await applyBridge.apply({
  proposal,
  diff,
  applyConfirmed: false,
  dryRun: true,
  allowDirtyWorkingTree: true,
  allowMissingRepository: true,
  backupEnabled: false,
});

assert(
  dryRunWithoutAuthorization.status === 'dry_run',
  'Expected dry-run to remain allowed without explicit apply authorization.',
);

const applyWithPersistedDecision = await applyBridge.apply({
  proposal,
  diff,
  applyConfirmed: true,
  allowDirtyWorkingTree: true,
  allowMissingRepository: true,
  backupEnabled: false,
});

assert(
  applyWithPersistedDecision.status === 'applied',
  'Expected apply bridge to apply after external persisted authorization lookup.',
);

const finalContent = await readFile(resolve(projectRoot, 'src/value.ts'), 'utf8');

assert(finalContent === nextContent, 'Expected selected file to be modified.');

console.log(
  JSON.stringify(
    {
      message: 'Persisted patch apply authorization test completed',
      persisted,
      dryRunStatus: dryRunWithoutAuthorization.status,
      applyStatus: applyWithPersistedDecision.status,
      finalContent,
    },
    null,
    2,
  ),
);
