import { PatchQualityEvaluator } from '../repair/PatchQualityEvaluator.js';
import type { PatchProposal, RepairRequest } from '../types/RepairTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const evaluator = new PatchQualityEvaluator();

const request: RepairRequest = {
  id: 'repair-request-quality-test',
  objective: 'Fix TypeScript error in src/components/Broken.tsx.',
  projectRoot: process.cwd(),
  findings: [
    {
      id: 'finding-1',
      source: 'typescript-direct',
      message: 'Broken component has an invalid return value.',
      relatedFile: 'src/components/Broken.tsx',
      line: 2,
      column: 10,
      severity: 'error',
    },
  ],
  targetFiles: [
    {
      relativePath: 'src/components/Broken.tsx',
      exists: true,
      content: 'export function Broken() {\n  return null;\n}\n',
      bytes: 42,
      role: 'primary_target',
      editable: true,
    },
    {
      relativePath: 'src/components/formatBrokenLabel.ts',
      exists: true,
      content: 'export function formatBrokenLabel(value: string): string {\n  return value;\n}\n',
      bytes: 80,
      role: 'related_context',
      editable: false,
    },
  ],
  constraints: [],
  expectedOutput: {
    format: 'json_patch_proposal',
    allowedOperations: ['replace_file', 'edit_file', 'create_file'],
    requireExplanation: true,
    requireRiskAssessment: true,
  },
};

const safeProposal: PatchProposal = {
  id: 'quality-safe-proposal',
  summary: 'Fix Broken component rendering.',
  riskLevel: 'low',
  operations: [
    {
      kind: 'replace_file',
      targetFile: 'src/components/Broken.tsx',
      expectedCurrentContent: 'export function Broken() {\n  return null;\n}\n',
      newContent: 'export function Broken() {\n  return <section>Fixed</section>;\n}\n',
      reason: 'Replace invalid return with valid JSX for the captured TypeScript finding.',
    },
  ],
  explanation: 'Single-file minimal repair for the captured component error.',
};

const safeEvaluation = evaluator.evaluate({
  request,
  proposal: safeProposal,
});

assert(safeEvaluation.acceptable, 'Expected safe patch quality evaluation to be acceptable.');
assert(
  !safeEvaluation.issues.some((issue) => issue.severity === 'error'),
  'Expected safe patch to produce no quality errors.',
);

const noOpProposal: PatchProposal = {
  id: 'quality-no-op-proposal',
  summary: 'No-op repair proposal.',
  riskLevel: 'low',
  operations: [
    {
      kind: 'replace_file',
      targetFile: 'src/components/Broken.tsx',
      expectedCurrentContent: 'export const value = 1;\n',
      newContent: 'export const value = 1;\n',
      reason: 'Keep the same content to test no-op detection.',
    },
  ],
  explanation: 'This proposal intentionally changes nothing.',
};

const noOpEvaluation = evaluator.evaluate({
  request,
  proposal: noOpProposal,
});

assert(noOpEvaluation.acceptable, 'No-op warning alone should not block quality evaluation.');
assert(
  noOpEvaluation.issues.some((issue) => issue.code === 'PATCH_QUALITY_NO_OP_OPERATION'),
  'Expected no-op operation quality warning.',
);
assert(
  noOpEvaluation.issues.some((issue) => issue.code === 'PATCH_QUALITY_ALL_OPERATIONS_NO_OP'),
  'Expected all-operations no-op quality warning.',
);

const relatedContextEditProposal: PatchProposal = {
  id: 'quality-related-context-edit-proposal',
  summary: 'Edit related context.',
  riskLevel: 'medium',
  operations: [
    {
      kind: 'replace_file',
      targetFile: 'src/components/formatBrokenLabel.ts',
      expectedCurrentContent: 'old',
      newContent: 'new',
      reason: 'Attempt to edit related context file.',
    },
  ],
  explanation: 'This should be rejected because the file is context only.',
};

const relatedContextEvaluation = evaluator.evaluate({
  request,
  proposal: relatedContextEditProposal,
});

assert(!relatedContextEvaluation.acceptable, 'Expected related context edit to be unacceptable.');
assert(
  relatedContextEvaluation.issues.some(
    (issue) => issue.code === 'PATCH_QUALITY_TARGET_NOT_PRIMARY',
  ),
  'Expected non-primary target quality error.',
);

const outsideContextProposal: PatchProposal = {
  id: 'quality-outside-context-proposal',
  summary: 'Edit unrelated file.',
  riskLevel: 'medium',
  operations: [
    {
      kind: 'replace_file',
      targetFile: 'src/unrelated.ts',
      expectedCurrentContent: 'old',
      newContent: 'new',
      reason: 'Attempt to edit unrelated file.',
    },
  ],
  explanation: 'This should be rejected because the file is outside repair context.',
};

const outsideContextEvaluation = evaluator.evaluate({
  request,
  proposal: outsideContextProposal,
});

assert(!outsideContextEvaluation.acceptable, 'Expected outside-context edit to be unacceptable.');
assert(
  outsideContextEvaluation.issues.some(
    (issue) => issue.code === 'PATCH_QUALITY_TARGET_NOT_IN_CONTEXT',
  ),
  'Expected outside-context quality error.',
);

const architectureSensitiveProposal: PatchProposal = {
  id: 'quality-architecture-sensitive-proposal',
  summary: 'Adjust runtime core behavior.',
  riskLevel: 'low',
  operations: [
    {
      kind: 'replace_file',
      targetFile: 'src/core/AgentRuntime.ts',
      expectedCurrentContent: 'old',
      newContent: 'new',
      reason: 'Change runtime core behavior for test coverage.',
    },
  ],
  explanation: 'Architecture-sensitive edit should be flagged.',
};

const architectureEvaluation = evaluator.evaluate({
  proposal: architectureSensitiveProposal,
});

assert(architectureEvaluation.acceptable, 'Architecture warning alone should not block.');
assert(
  architectureEvaluation.issues.some(
    (issue) => issue.code === 'PATCH_QUALITY_ARCHITECTURE_SENSITIVE_EDIT',
  ),
  'Expected architecture-sensitive quality warning.',
);

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'patch-quality-evaluator-test',
      safeIssues: safeEvaluation.issues,
      noOpIssues: noOpEvaluation.issues,
      relatedContextIssues: relatedContextEvaluation.issues,
      outsideContextIssues: outsideContextEvaluation.issues,
      architectureIssues: architectureEvaluation.issues,
    },
    null,
    2,
  ),
);
