import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { RepairAttemptRunner } from '../repair/RepairAttemptRunner.js';
import { RepairAttemptReporter } from '../repair/RepairAttemptReporter.js';
import { StaticRepairProposalProvider } from '../repair/StaticRepairProposalProvider.js';
import type { PatchProposal } from '../types/RepairTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const projectRoot = resolve('.runtime/repair-attempt-test-project');
const reportPath = resolve('.runtime/repair-attempt-test.md');
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
  return <section>Fixed</section>;
}
`;

await writeFile(join(projectRoot, targetFile), currentContent, 'utf8');

const proposal: PatchProposal = {
  id: 'proposal-1',
  summary: 'Fix broken component text.',
  riskLevel: 'low',
  operations: [
    {
      kind: 'replace_file',
      targetFile,
      expectedCurrentContent: currentContent,
      newContent,
      reason: 'Replace invalid/broken output with corrected JSX.',
    },
  ],
  explanation: 'Minimal single-file repair.',
};

const runner = new RepairAttemptRunner({
  proposalProvider: new StaticRepairProposalProvider(proposal),
  reporter: new RepairAttemptReporter({
    outputPath: reportPath,
  }),
});

const result = await runner.run({
  objective: 'Fix the broken component.',
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

assert(result.status === 'diff_ready', 'Expected repair attempt to reach diff_ready.');
assert(result.patchValidation.valid, 'Expected patch proposal to be valid.');
assert(result.diffPreviews.length === 1, 'Expected one diff preview.');
assert(result.diffPreviews[0]?.changed === true, 'Expected diff to be changed.');
assert(
  result.steps.some((step) => step.id === 'proposal_received' && step.status === 'executed'),
  'Expected proposal_received step.',
);
assert(result.modelUsage?.estimatedUsd === 0, 'Expected static provider zero cost.');

await rm(projectRoot, {
  recursive: true,
  force: true,
});

console.log(
  JSON.stringify({
    message: 'Repair attempt runner test completed',
    status: result.status,
    steps: result.steps,
    blockers: result.blockers,
    failures: result.failures,
    diffPreviews: result.diffPreviews.map((preview) => ({
      targetFile: preview.targetFile,
      changed: preview.changed,
      changedLines: preview.changedLines,
    })),
    modelUsage: result.modelUsage,
  }),
);
