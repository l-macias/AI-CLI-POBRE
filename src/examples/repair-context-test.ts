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
  `export function Broken() {
  return <section>Broken</section>;
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

assert(request.targetFiles.length === 1, 'Expected one repair target file.');
assert(prompt.includes('REQUIRED OUTPUT'), 'Expected repair prompt output contract.');
assert(prompt.includes('src/components/Broken.tsx'), 'Expected target file in prompt.');
assert(prompt.includes('NO_SECRET_ACCESS'), 'Expected safety constraint in prompt.');

const validProposal: PatchProposal = {
  id: 'proposal-1',
  summary: 'Fix Broken component.',
  riskLevel: 'low',
  operations: [
    {
      kind: 'replace_file',
      targetFile: 'src/components/Broken.tsx',
      newContent: `export function Broken() {
  return <section>Fixed</section>;
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

await rm(projectRoot, {
  recursive: true,
  force: true,
});

console.log(
  JSON.stringify({
    message: 'Repair context test completed',
    requestId: request.id,
    promptLength: prompt.length,
    validation,
    invalidValidation,
  }),
);
