import { PatchProposalParser } from '../repair/PatchProposalParser.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

const parser = new PatchProposalParser();

const validProposal = {
  id: 'proposal-1',
  summary: 'Fix component rendering.',
  riskLevel: 'low',
  operations: [
    {
      kind: 'replace_file',
      targetFile: 'src/components/Broken.tsx',
      expectedCurrentContent: 'export function Broken() {}\n',
      newContent: 'export function Broken() {\n  return <section>Fixed</section>;\n}\n',
      reason: 'Replace broken implementation with valid JSX.',
    },
  ],
  explanation: 'Minimal single-file repair.',
};

const strictValid = parser.parse(stringify(validProposal));

assert(strictValid.ok, 'Expected strict valid JSON proposal to parse.');
assert(strictValid.ok && strictValid.value.id === 'proposal-1', 'Expected parsed proposal id.');

const fencedValid = parser.parse(
  `\`\`\`json
${stringify(validProposal)}
\`\`\``,
  {
    allowJsonExtraction: true,
  },
);

assert(fencedValid.ok, 'Expected fenced JSON proposal to parse in extraction mode.');

const surroundedValid = parser.parse(
  `The proposal is below:

${stringify(validProposal)}

End of proposal.`,
  {
    allowJsonExtraction: true,
  },
);

assert(surroundedValid.ok, 'Expected surrounded JSON proposal to parse in extraction mode.');

const surroundedStrictInvalid = parser.parse(`Text before ${stringify(validProposal)}`);

assert(!surroundedStrictInvalid.ok, 'Expected surrounded JSON to fail in strict mode.');

const invalidJson = parser.parse('{ invalid json');

assert(!invalidJson.ok, 'Expected invalid JSON to fail.');

const missingId = parser.parse(
  stringify({
    summary: 'Missing id.',
    riskLevel: 'low',
    operations: [],
    explanation: 'Invalid proposal.',
  }),
);

assert(!missingId.ok, 'Expected missing id to fail.');

const invalidRisk = parser.parse(
  stringify({
    ...validProposal,
    riskLevel: 'critical',
  }),
);

assert(!invalidRisk.ok, 'Expected invalid riskLevel to fail.');

const invalidOperationKind = parser.parse(
  stringify({
    ...validProposal,
    operations: [
      {
        kind: 'rename_file',
        targetFile: 'src/a.ts',
        newContent: 'content',
        reason: 'Invalid operation.',
      },
    ],
  }),
);

assert(!invalidOperationKind.ok, 'Expected invalid operation kind to fail.');

const emptyTargetFile = parser.parse(
  stringify({
    ...validProposal,
    operations: [
      {
        kind: 'replace_file',
        targetFile: '',
        newContent: 'content',
        reason: 'Invalid empty target.',
      },
    ],
  }),
);

assert(!emptyTargetFile.ok, 'Expected empty targetFile to fail.');

const emptyReason = parser.parse(
  stringify({
    ...validProposal,
    operations: [
      {
        kind: 'replace_file',
        targetFile: 'src/a.ts',
        newContent: 'content',
        reason: '',
      },
    ],
  }),
);

assert(!emptyReason.ok, 'Expected empty reason to fail.');

const missingNewContentForReplace = parser.parse(
  stringify({
    ...validProposal,
    operations: [
      {
        kind: 'replace_file',
        targetFile: 'src/a.ts',
        reason: 'Missing newContent.',
      },
    ],
  }),
);

assert(!missingNewContentForReplace.ok, 'Expected replace_file without newContent to fail.');

const missingNewContentForEdit = parser.parse(
  stringify({
    ...validProposal,
    operations: [
      {
        kind: 'edit_file',
        targetFile: 'src/a.ts',
        reason: 'Missing newContent.',
      },
    ],
  }),
);

assert(!missingNewContentForEdit.ok, 'Expected edit_file without newContent to fail.');

const missingNewContentForCreate = parser.parse(
  stringify({
    ...validProposal,
    operations: [
      {
        kind: 'create_file',
        targetFile: 'src/a.ts',
        reason: 'Missing newContent.',
      },
    ],
  }),
);

assert(!missingNewContentForCreate.ok, 'Expected create_file without newContent to fail.');

const invalidExpectedCurrentContent = parser.parse(
  stringify({
    ...validProposal,
    operations: [
      {
        kind: 'replace_file',
        targetFile: 'src/a.ts',
        expectedCurrentContent: 123,
        newContent: 'content',
        reason: 'Invalid expectedCurrentContent.',
      },
    ],
  }),
);

assert(!invalidExpectedCurrentContent.ok, 'Expected non-string expectedCurrentContent to fail.');

const deleteProposal = parser.parse(
  stringify({
    id: 'proposal-delete',
    summary: 'Delete obsolete file.',
    riskLevel: 'high',
    operations: [
      {
        kind: 'delete_file',
        targetFile: 'src/obsolete.ts',
        expectedCurrentContent: 'old content',
        reason: 'The file is obsolete.',
      },
    ],
    explanation: 'Delete proposal is schema-valid but must still be safety-gated later.',
  }),
);

assert(deleteProposal.ok, 'Expected delete_file to be schema-valid.');
assert(
  deleteProposal.ok && deleteProposal.value.operations[0]?.kind === 'delete_file',
  'Expected parsed delete_file operation.',
);

console.log(
  JSON.stringify({
    message: 'Repair proposal parser test completed',
    strictValid: strictValid.ok,
    fencedValid: fencedValid.ok,
    surroundedValid: surroundedValid.ok,
    deleteProposalValidAtSchemaLevel: deleteProposal.ok,
  }),
);
