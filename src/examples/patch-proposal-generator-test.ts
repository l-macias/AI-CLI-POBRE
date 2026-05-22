import { rm } from 'node:fs/promises';
import path from 'node:path';
import { PatchProposalGenerator } from '../patches/PatchProposalGenerator.js';
import { PatchStorage } from '../patches/PatchStorage.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/patch-proposal-generator-test');

await rm(testRoot, {
  recursive: true,
  force: true,
});

const generator = new PatchProposalGenerator();
const storage = new PatchStorage();

const valid = generator.generate({
  planId: 'runtime-plan-session-85-test',
  sessionId: 'session-85-patch-proposal-test',
  projectRoot: testRoot,
  summary: 'Improve profile component and API client safely.',
  riskLevel: 'low',
  candidateFiles: [
    {
      path: 'src/components/ProfileCard.tsx',
      content: 'export function ProfileCard() { return <section>Profile</section>; }\n',
      existsKnown: true,
      reason: 'Profile component is the primary UI file selected by the runtime plan.',
    },
    {
      path: 'src/api/profileApi.ts',
      content: 'export async function getProfile() { return fetch("/api/profile"); }\n',
      existsKnown: true,
      reason: 'Profile API client is directly related to the profile UI workflow.',
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

assert(valid.validation.valid, 'Expected patch proposal to be valid.');
assert(valid.proposal.status === 'validated', 'Expected patch proposal to be validated.');
assert(valid.proposal.files.length === 2, 'Expected two file changes.');
assert(
  valid.proposal.files.every((file) => file.operation === 'modify'),
  'Expected modify operations for known files.',
);
assert(
  valid.proposal.files.every((file) => typeof file.beforeHash === 'string'),
  'Expected beforeHash for modify operations.',
);
assert(valid.proposal.requiresApproval, 'Expected patch proposal to require approval.');

const saved = await storage.save(valid);

assert(saved.proposalPath.endsWith('.json'), 'Expected persisted patch proposal path.');
assert(
  saved.activeProposalPath.endsWith('active-patch-proposal.json'),
  'Expected active patch proposal path.',
);

const blocked = generator.generate({
  planId: 'runtime-plan-session-85-blocked-test',
  sessionId: 'session-85-patch-proposal-blocked-test',
  projectRoot: testRoot,
  summary: 'Modify env file.',
  riskLevel: 'high',
  candidateFiles: [
    {
      path: '.env',
      content: 'SECRET=value\n',
      existsKnown: true,
      reason: 'This should be blocked because it targets a protected secret file.',
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

assert(!blocked.validation.valid, 'Expected protected patch proposal to be invalid.');
assert(blocked.proposal.status === 'rejected', 'Expected protected patch proposal rejected.');
assert(
  blocked.validation.issues.some((issue) => issue.code === 'PROTECTED_PATCH_PATH_NOT_ALLOWED'),
  'Expected protected path issue.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'patch-proposal-generator-test',
      validProposalId: valid.proposal.id,
      validStatus: valid.proposal.status,
      validRiskLevel: valid.proposal.riskLevel,
      validFiles: valid.proposal.files.length,
      blockedStatus: blocked.proposal.status,
      blockedIssues: blocked.validation.issues.map((issue) => issue.code),
      proposalPath: saved.proposalPath,
      activeProposalPath: saved.activeProposalPath,
    },
    null,
    2,
  ),
);
