import { ApprovalCenter } from '../approval/ApprovalCenter.js';
import type { ApprovalCenterArtifactState } from '../approval/ApprovalRequest.js';
import { PatchProposalGenerator } from '../patches/PatchProposalGenerator.js';

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
const generator = new PatchProposalGenerator();

const generated = generator.generate({
  planId: 'plan-file-review-test',
  sessionId: 'session-file-review-test',
  projectRoot: '/tmp/zero-runtime-file-review-test',
  summary: 'Validate file-level patch review metadata and selective approval.',
  riskLevel: 'medium',
  candidateFiles: [
    {
      path: 'src/components/Hero.tsx',
      content: 'export function Hero() {\n  return <section>Hero</section>;\n}\n',
      existsKnown: true,
      reason: 'Hero is the selected UI component for the patch review test.',
    },
    {
      path: 'src/security/ProtectedPathPolicy.ts',
      content: 'export const protectedPaths = [];\n',
      existsKnown: true,
      reason: 'Security policy path is included to validate high-risk file selection behavior.',
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
});

assert(generated.validation.valid, 'Expected generated patch proposal to be valid.');
assert(generated.proposal.files.length === 2, 'Expected two patch files.');

const heroFile = required(
  generated.proposal.files.find((file) => file.path === 'src/components/Hero.tsx'),
  'Expected Hero file change.',
);

const securityFile = required(
  generated.proposal.files.find((file) => file.path === 'src/security/ProtectedPathPolicy.ts'),
  'Expected security policy file change.',
);

assert(heroFile.changesSummary.length > 0, 'Expected Hero changesSummary.');
assert(heroFile.riskLevel === 'medium', 'Expected Hero risk to inherit multi-file medium risk.');
assert(heroFile.userSelectable === true, 'Expected Hero file to be selectable.');

assert(securityFile.changesSummary.length > 0, 'Expected security changesSummary.');
assert(securityFile.riskLevel === 'high', 'Expected security file risk to be high.');
assert(securityFile.userSelectable === true, 'Expected security file to be selectable.');

const approvalCenter = new ApprovalCenter();

const artifactState: ApprovalCenterArtifactState = {
  sessionId: generated.proposal.sessionId,
  projectRoot: generated.proposal.projectRoot,
  plan: null,
  proposal: generated.proposal,
  diff: {
    id: 'diff-file-review-test',
    proposalId: generated.proposal.id,
    planId: generated.proposal.planId,
    sessionId: generated.proposal.sessionId,
    projectRoot: generated.proposal.projectRoot,
    files: [],
    summary: {
      filesChanged: 2,
      additions: 2,
      deletions: 0,
    },
    safeToPreview: true,
    createdAt: new Date().toISOString(),
  },
  applyResult: null,
  lastVerifyRun: null,
  snapshotAvailable: true,
  dirtyWorkingTree: false,
};

const center = approvalCenter.build(artifactState);
const patchRequest = required(
  center.requests.find((request) => request.kind === 'patch'),
  'Expected patch approval request.',
);
assert(patchRequest.fileReviews.length === 2, 'Expected file-level reviews in patch request.');
assert(
  patchRequest.fileReviews.every((review) => review.userSelectable),
  'Expected all patch file reviews to be selectable.',
);
assert(
  patchRequest.fileReviews.every((review) => review.changesSummary.length > 0),
  'Expected all patch file reviews to include changesSummary.',
);

const approveSelected = approvalCenter.decide(center, {
  requestId: patchRequest.id,
  action: 'approve_selected_files',
  selectedFilePaths: ['src/components/Hero.tsx'],
});

assert(approveSelected.accepted, 'Expected selected-file approval to be accepted.');
assert(
  approveSelected.selectedFilePaths.length === 1 &&
    approveSelected.selectedFilePaths[0] === 'src/components/Hero.tsx',
  'Expected selected-file approval to keep only selected file.',
);

const approveAll = approvalCenter.decide(center, {
  requestId: patchRequest.id,
  action: 'approve',
});

assert(approveAll.accepted, 'Expected approve all to be accepted.');
assert(approveAll.selectedFilePaths.length === 2, 'Expected approve all to include all files.');

console.log(
  JSON.stringify(
    {
      message: 'Patch file review approval test completed',
      proposalId: generated.proposal.id,
      fileReviews: patchRequest.fileReviews,
      approveSelected,
      approveAll,
    },
    null,
    2,
  ),
);
