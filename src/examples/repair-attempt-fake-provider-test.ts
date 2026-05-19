import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { FakeLlmRepairProposalProvider } from '../repair/FakeLlmRepairProposalProvider.js';
import { RepairAttemptReporter } from '../repair/RepairAttemptReporter.js';
import { RepairAttemptRunner } from '../repair/RepairAttemptRunner.js';
import type { PatchProposal } from '../types/RepairTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const projectRoot = resolve('.runtime/repair-attempt-fake-provider-test-project');
const reportPath = resolve('.runtime/repair-attempt-fake-provider-test.md');
const targetFile = 'src/components/Broken.tsx';

await rm(projectRoot, {
  recursive: true,
  force: true,
});

await mkdir(join(projectRoot, 'src/components'), {
  recursive: true,
});

const currentContent = `export function Broken() {
  return <section>Broken</section>;
}
`;

const newContent = `export function Broken() {
  return <section>Fixed by fake provider</section>;
}
`;

await writeFile(join(projectRoot, targetFile), currentContent, 'utf8');

const provider = new FakeLlmRepairProposalProvider({
  mode: 'text_around_json',
  proposalFactory: (): PatchProposal => {
    return {
      id: 'fake-provider-runner-proposal',
      summary: 'Fix broken component through fake provider.',
      riskLevel: 'low',
      operations: [
        {
          kind: 'replace_file',
          targetFile,
          expectedCurrentContent: currentContent,
          newContent,
          reason: 'Replace broken output with deterministic fake provider repair.',
        },
      ],
      explanation:
        'The fake provider returns model-like text, and the runtime parser validates the proposal.',
    };
  },
});

const runner = new RepairAttemptRunner({
  proposalProvider: provider,
  reporter: new RepairAttemptReporter({
    outputPath: reportPath,
  }),
});

const result = await runner.run({
  objective: 'Fix the broken component through fake provider.',
  projectRoot,
  targetFiles: [targetFile],
  findings: [
    {
      id: 'finding-1',
      source: 'typescript-direct',
      message: 'src/components/Broken.tsx(2,10): error TS1382: Unexpected token.',
      relatedFile: targetFile,
      line: 2,
      column: 10,
      severity: 'error',
    },
  ],
});

assert(
  result.status === 'diff_ready',
  'Expected fake provider repair attempt to reach diff_ready.',
);
assert(result.proposal?.id === 'fake-provider-runner-proposal', 'Expected fake provider proposal.');
assert(result.patchValidation.valid, 'Expected fake provider proposal to pass safety validation.');
assert(result.diffPreviews.length === 1, 'Expected one diff preview.');
assert(result.diffPreviews[0]?.changed === true, 'Expected changed diff preview.');
const modelUsage = result.modelUsage;

if (modelUsage === undefined) {
  throw new Error('Expected fake LLM model usage.');
}

assert(modelUsage.provider === 'fake-llm', 'Expected fake LLM provider.');
assert(modelUsage.totalTokens > 0, 'Expected fake token estimate.');

await rm(projectRoot, {
  recursive: true,
  force: true,
});

console.log(
  JSON.stringify({
    message: 'Repair attempt fake provider integration test completed',
    status: result.status,
    proposalId: result.proposal?.id,
    patchValid: result.patchValidation.valid,
    diffPreviews: result.diffPreviews.map((preview) => ({
      targetFile: preview.targetFile,
      changed: preview.changed,
      changedLines: preview.changedLines,
    })),
    modelUsage: result.modelUsage,
  }),
);
