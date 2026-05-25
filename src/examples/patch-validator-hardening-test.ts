import { PatchProposalValidator } from '../patches/PatchProposalValidator.js';
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

function file(input: {
  path: string;
  operation?: PatchFileChange['operation'];
  riskLevel?: PatchFileChange['riskLevel'];
  beforeHash?: string | null;
  content?: string | null;
}): PatchFileChange {
  return {
    path: input.path,
    operation: input.operation ?? 'modify',
    beforeHash: input.beforeHash ?? 'hash',
    content: input.content ?? 'export const value = true;\n',
    reason: `Validator hardening test file for ${input.path}.`,
    changesSummary: [`Validates policy enforcement for ${input.path}.`],
    riskLevel: input.riskLevel ?? 'low',
    userSelectable: true,
  };
}

function risk(input: { code: string; level: PatchProposalRisk['level'] }): PatchProposalRisk {
  return {
    code: input.code,
    level: input.level,
    message: `Validator hardening test risk: ${input.code}.`,
    mitigation: `Validator hardening test mitigation for ${input.code}.`,
  };
}

function proposal(input: {
  files: PatchFileChange[];
  risks: PatchProposalRisk[];
  riskLevel: RuntimePatchProposal['riskLevel'];
}): RuntimePatchProposal {
  return {
    id: 'proposal-validator-hardening-test',
    planId: 'plan-validator-hardening-test',
    sessionId: 'session-validator-hardening-test',
    projectRoot: '/tmp/zero-runtime-validator-hardening-test',
    summary: 'Validate patch proposal validator hardening.',
    files: input.files,
    risks: input.risks,
    verifyCommands: [
      {
        command: 'npm',
        args: ['run', 'typecheck'],
        reason: 'Validate TypeScript after hardened patch proposal validation.',
        requiresApproval: true,
      },
    ],
    riskLevel: input.riskLevel,
    requiresApproval: true,
    status: 'validated',
    createdAt: '2026-05-25T00:00:00.000Z',
  };
}

const validator = new PatchProposalValidator();

const understatedSecurityProposal = proposal({
  files: [
    file({
      path: 'src/security/PromptInjectionScanner.ts',
      riskLevel: 'low',
    }),
  ],
  risks: [risk({ code: 'LOW_RISK_PATCH_PROPOSAL', level: 'low' })],
  riskLevel: 'low',
});

const understatedSecurityResult = validator.validate(understatedSecurityProposal);

assert(!understatedSecurityResult.valid, 'Expected understated security proposal to be invalid.');
assert(
  understatedSecurityResult.issues.some((issue) => issue.code === 'PATCH_FILE_RISK_UNDERSTATED'),
  'Expected file risk understatement issue for security file.',
);
assert(
  understatedSecurityResult.issues.some(
    (issue) => issue.code === 'PATCH_PROPOSAL_RISK_UNDERSTATED',
  ),
  'Expected proposal risk understatement issue for security proposal.',
);
assert(
  understatedSecurityResult.issues.some((issue) => issue.code === 'PATCH_POLICY_RISK_MISSING'),
  'Expected missing policy risk issue for security proposal.',
);

const dependencyProposal = proposal({
  files: [
    file({
      path: 'package.json',
      riskLevel: 'high',
    }),
  ],
  risks: [risk({ code: 'DEPENDENCY_SENSITIVE_PATH', level: 'high' })],
  riskLevel: 'high',
});

const dependencyResult = validator.validate(dependencyProposal);

assert(dependencyResult.valid, 'Expected dependency proposal with correct high risk to be valid.');

const deleteProposal = proposal({
  files: [
    file({
      path: 'ui/src/components/Button.tsx',
      operation: 'delete',
      beforeHash: 'hash',
      content: null,
      riskLevel: 'high',
    }),
  ],
  risks: [risk({ code: 'DELETE_OPERATION', level: 'high' })],
  riskLevel: 'high',
});

const deleteResult = validator.validate(deleteProposal);

assert(!deleteResult.valid, 'Expected delete proposal to remain invalid.');
assert(
  deleteResult.issues.some((issue) => issue.code === 'PATCH_DELETE_BLOCKED'),
  'Expected delete operation to be blocked.',
);

const protectedPathProposal = proposal({
  files: [
    file({
      path: '.env',
      riskLevel: 'high',
    }),
  ],
  risks: [risk({ code: 'PROTECTED_PATH', level: 'high' })],
  riskLevel: 'high',
});

const protectedPathResult = validator.validate(protectedPathProposal);

assert(!protectedPathResult.valid, 'Expected protected path proposal to be invalid.');
assert(
  protectedPathResult.issues.some((issue) => issue.code === 'PROTECTED_PATCH_PATH_NOT_ALLOWED'),
  'Expected protected path issue.',
);

const validUiProposal = proposal({
  files: [
    file({
      path: 'ui/src/components/Button.tsx',
      riskLevel: 'low',
    }),
  ],
  risks: [risk({ code: 'LOW_RISK_PATCH_PROPOSAL', level: 'low' })],
  riskLevel: 'low',
});

const validUiResult = validator.validate(validUiProposal);

assert(validUiResult.valid, 'Expected valid low-risk UI proposal to pass.');

console.log(
  JSON.stringify(
    {
      message: 'Patch validator hardening test completed',
      understatedSecurityIssues: understatedSecurityResult.issues.map((issue) => issue.code),
      dependencyValid: dependencyResult.valid,
      deleteIssues: deleteResult.issues.map((issue) => issue.code),
      protectedPathIssues: protectedPathResult.issues.map((issue) => issue.code),
      validUi: validUiResult.valid,
    },
    null,
    2,
  ),
);
