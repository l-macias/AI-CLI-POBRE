import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PatchDiffBuilder } from '../diff/PatchDiffBuilder.js';
import type { PatchDiffPreview } from '../diff/PatchDiffTypes.js';
import { PatchApplySafetyGuard } from '../patches/PatchApplySafetyGuard.js';
import { RuntimePatchApplyBridge } from '../patches/RuntimePatchApplyBridge.js';
import type {
  PatchFileChange,
  PatchProposalRisk,
  RuntimePatchProposal,
} from '../patches/PatchProposal.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function cloneDiff(diff: PatchDiffPreview): PatchDiffPreview {
  return JSON.parse(JSON.stringify(diff)) as PatchDiffPreview;
}

const projectRoot = resolve('.runtime/patch-apply-safety-guard-test/project');

await rm(resolve('.runtime/patch-apply-safety-guard-test'), {
  recursive: true,
  force: true,
});

await mkdir(resolve(projectRoot, 'src'), {
  recursive: true,
});

const originalContent = 'export const value = 1;\n';
const nextContent = 'export const value = 2;\n';

await writeFile(resolve(projectRoot, 'src/value.ts'), originalContent, 'utf8');

const file: PatchFileChange = {
  path: 'src/value.ts',
  operation: 'modify',
  beforeHash: hashContent(originalContent),
  content: nextContent,
  reason: 'Update value file for patch apply safety guard test.',
  changesSummary: ['Updates value from 1 to 2.'],
  riskLevel: 'low',
  userSelectable: true,
};

const lowRisk: PatchProposalRisk = {
  code: 'LOW_RISK_PATCH_PROPOSAL',
  level: 'low',
  message: 'Patch proposal is limited to low-impact non-sensitive files.',
  mitigation: 'Still require diff preview and user approval before apply.',
};

const proposal: RuntimePatchProposal = {
  id: 'proposal-apply-safety-guard-test',
  planId: 'plan-apply-safety-guard-test',
  sessionId: 'session-apply-safety-guard-test',
  projectRoot,
  summary: 'Validate patch apply safety guard.',
  files: [file],
  risks: [lowRisk],
  verifyCommands: [
    {
      command: 'npm',
      args: ['run', 'typecheck'],
      reason: 'Validate TypeScript after apply safety guard test.',
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

const guard = new PatchApplySafetyGuard();

const validGuard = guard.validate({
  proposal,
  diff,
});

assert(validGuard.allowed, 'Expected matching proposal/diff to be allowed.');

const wrongProposalDiff = cloneDiff(diff);
wrongProposalDiff.proposalId = 'other-proposal';

const wrongProposalResult = guard.validate({
  proposal,
  diff: wrongProposalDiff,
});

assert(!wrongProposalResult.allowed, 'Expected wrong proposalId diff to be blocked.');
assert(
  wrongProposalResult.issues.some((issue) => issue.code === 'DIFF_PROPOSAL_MISMATCH'),
  'Expected DIFF_PROPOSAL_MISMATCH issue.',
);

const extraFileDiff = cloneDiff(diff);
extraFileDiff.files.push({
  path: 'src/extra.ts',
  status: 'added',
  beforeHash: null,
  afterHash: hashContent('export const extra = true;\n'),
  additions: 1,
  deletions: 0,
  beforeContent: null,
  afterContent: 'export const extra = true;\n',
  lines: [
    {
      lineNumber: 1,
      type: 'added',
      content: 'export const extra = true;',
    },
  ],
});

const extraFileResult = guard.validate({
  proposal,
  diff: extraFileDiff,
});

assert(!extraFileResult.allowed, 'Expected diff with extra file to be blocked.');
assert(
  extraFileResult.issues.some((issue) => issue.code === 'DIFF_HAS_EXTRA_FILES'),
  'Expected DIFF_HAS_EXTRA_FILES issue.',
);

const missingFileDiff = cloneDiff(diff);
missingFileDiff.files = [];

const missingFileResult = guard.validate({
  proposal,
  diff: missingFileDiff,
});

assert(!missingFileResult.allowed, 'Expected diff missing proposal file to be blocked.');
assert(
  missingFileResult.issues.some((issue) => issue.code === 'DIFF_MISSING_PROPOSAL_FILES'),
  'Expected DIFF_MISSING_PROPOSAL_FILES issue.',
);

const mismatchedContentDiff = cloneDiff(diff);
const firstMismatchedFile = mismatchedContentDiff.files[0];

if (!firstMismatchedFile) {
  throw new Error('Expected first diff file.');
}

firstMismatchedFile.afterContent = 'export const value = 999;\n';

const mismatchedContentResult = guard.validate({
  proposal,
  diff: mismatchedContentDiff,
});

assert(!mismatchedContentResult.allowed, 'Expected mismatched afterContent to be blocked.');
assert(
  mismatchedContentResult.issues.some((issue) => issue.code === 'DIFF_AFTER_CONTENT_MISMATCH'),
  'Expected DIFF_AFTER_CONTENT_MISMATCH issue.',
);

const understatedProposal: RuntimePatchProposal = {
  ...proposal,
  id: 'proposal-understated-apply-safety-guard-test',
  files: [
    {
      ...file,
      path: 'src/security/PromptInjectionScanner.ts',
      riskLevel: 'low',
    },
  ],
  risks: [lowRisk],
  riskLevel: 'low',
};

const understatedDiff = new PatchDiffBuilder().build({
  proposal: understatedProposal,
}).diff;

const understatedResult = guard.validate({
  proposal: understatedProposal,
  diff: understatedDiff,
});

assert(!understatedResult.allowed, 'Expected understated risk proposal to be blocked.');
assert(
  understatedResult.issues.some((issue) => issue.code === 'VALIDATION_PATCH_FILE_RISK_UNDERSTATED'),
  'Expected validation issue for understated file risk.',
);

const applyBridge = new RuntimePatchApplyBridge();

const dryRunResult = await applyBridge.apply({
  proposal,
  diff,
  applyConfirmed: false,
  dryRun: true,
  allowDirtyWorkingTree: true,
  allowMissingRepository: true,
  backupEnabled: false,
});

assert(dryRunResult.status === 'dry_run', 'Expected valid dry-run apply to pass safety guard.');
assert(
  dryRunResult.operationResults.length === 1,
  'Expected valid dry-run to include one operation.',
);

console.log(
  JSON.stringify(
    {
      message: 'Patch apply safety guard test completed',
      validGuard,
      wrongProposalIssues: wrongProposalResult.issues,
      extraFileIssues: extraFileResult.issues,
      missingFileIssues: missingFileResult.issues,
      mismatchedContentIssues: mismatchedContentResult.issues,
      understatedIssues: understatedResult.issues,
      dryRunStatus: dryRunResult.status,
    },
    null,
    2,
  ),
);
