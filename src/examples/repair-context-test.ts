import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { RepairContextBuilder } from '../repair/RepairContextBuilder.js';
import { RepairPromptBuilder } from '../repair/RepairPromptBuilder.js';
import { RepairRequestBuilder } from '../repair/RepairRequestBuilder.js';
import { PatchSafetyValidator } from '../repair/PatchSafetyValidator.js';
import type { PatchProposal } from '../types/RepairTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const projectRoot = resolve('.runtime/repair-context-test-project');

await rm(projectRoot, {
  recursive: true,
  force: true,
});

await mkdir(join(projectRoot, 'src/components'), {
  recursive: true,
});

await writeFile(
  join(projectRoot, 'src/components/Broken.tsx'),
  `import { formatBrokenLabel } from './formatBrokenLabel.js';

export function Broken() {
  return <section>{formatBrokenLabel('Broken')}</section>;
}
`,
  'utf8',
);

await writeFile(
  join(projectRoot, 'src/components/formatBrokenLabel.ts'),
  `export function formatBrokenLabel(value: string): string {
  return value.trim();
}
`,
  'utf8',
);

const findings = [
  {
    id: 'finding-1',
    source: 'typescript-direct',
    message: 'src/components/Broken.tsx(2,10): error TS1382: Unexpected token.',
    relatedFile: 'src/components/Broken.tsx',
    line: 2,
    column: 10,
    severity: 'error' as const,
  },
];

const contextBuilder = new RepairContextBuilder();
const targetFiles = await contextBuilder.build({
  projectRoot,
  targetFiles: ['src/components/Broken.tsx'],
  findings,
  maxRelatedFiles: 2,
});

const requestBuilder = new RepairRequestBuilder();
const request = requestBuilder.build({
  objective: 'Fix TypeScript error in Broken component.',
  projectRoot,
  findings,
  targetFiles,
});

const promptBuilder = new RepairPromptBuilder();
const prompt = promptBuilder.build(request);

assert(request.targetFiles.length >= 1, 'Expected at least one repair target file.');
assert(
  request.targetFiles.some((file) => file.role === 'primary_target' && file.editable === true),
  'Expected primary editable target file.',
);
assert(
  request.targetFiles.some((file) => file.role === 'related_context' && file.editable === false),
  'Expected related read-only context file.',
);
assert(prompt.includes('REQUIRED OUTPUT'), 'Expected repair prompt output contract.');
assert(prompt.includes('src/components/Broken.tsx'), 'Expected target file in prompt.');
assert(prompt.includes('NO_SECRET_ACCESS'), 'Expected safety constraint in prompt.');
assert(prompt.includes('ROLE: primary_target'), 'Expected prompt to mark primary target role.');
assert(prompt.includes('ROLE: related_context'), 'Expected prompt to mark related context role.');
assert(
  prompt.includes('BEGIN_UNTRUSTED_FILE_CONTENT'),
  'Expected prompt to mark file content as untrusted.',
);

const validProposal: PatchProposal = {
  id: 'proposal-1',
  summary: 'Fix Broken component.',
  riskLevel: 'low',
  operations: [
    {
      kind: 'replace_file',
      targetFile: 'src/components/Broken.tsx',
      newContent: `import { formatBrokenLabel } from './formatBrokenLabel.js';

export function Broken() {
  return <section>{formatBrokenLabel('Fixed')}</section>;
}
`,
      reason: 'Replace broken JSX with valid JSX.',
    },
  ],
  explanation: 'Minimal component fix.',
};

const validator = new PatchSafetyValidator();
const validation = validator.validate({
  request,
  proposal: validProposal,
});

assert(validation.valid, 'Expected valid proposal.');

const invalidProposal: PatchProposal = {
  id: 'proposal-2',
  summary: 'Unsafe patch.',
  riskLevel: 'high',
  operations: [
    {
      kind: 'replace_file',
      targetFile: '.env.local',
      newContent: 'SECRET=leak',
      reason: 'Unsafe.',
    },
  ],
  explanation: 'Unsafe.',
};

const invalidValidation = validator.validate({
  request,
  proposal: invalidProposal,
});

assert(!invalidValidation.valid, 'Expected invalid proposal.');

const relatedContextFile = request.targetFiles.find((file) => file.role === 'related_context');

if (!relatedContextFile) {
  throw new Error('Expected related context file.');
}

const readOnlyContextProposal: PatchProposal = {
  id: 'proposal-3',
  summary: 'Unsafe related context edit.',
  riskLevel: 'medium',
  operations: [
    {
      kind: 'replace_file',
      targetFile: relatedContextFile.relativePath,
      newContent: relatedContextFile.content,
      reason: 'This should be blocked because related context is read-only.',
    },
  ],
  explanation: 'Unsafe context edit.',
};

const readOnlyContextValidation = validator.validate({
  request,
  proposal: readOnlyContextProposal,
});

assert(!readOnlyContextValidation.valid, 'Expected related context edit to be invalid.');
assert(
  readOnlyContextValidation.issues.some(
    (issue) => issue.code === 'PATCH_TARGET_IS_READ_ONLY_CONTEXT',
  ),
  'Expected read-only context validation issue.',
);

await rm(projectRoot, {
  recursive: true,
  force: true,
});

console.log(
  JSON.stringify({
    message: 'Repair context test completed',
    requestId: request.id,
    promptLength: prompt.length,
    targetFiles: request.targetFiles.map((file) => ({
      relativePath: file.relativePath,
      role: file.role,
      editable: file.editable,
      contextReasons: file.contextReasons,
    })),
    validation,
    invalidValidation,
    readOnlyContextValidation,
  }),
);
