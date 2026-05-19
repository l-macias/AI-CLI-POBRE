import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { FakeLlmRepairProposalProvider } from '../repair/FakeLlmRepairProposalProvider.js';
import { RepairContextBuilder } from '../repair/RepairContextBuilder.js';
import { RepairPromptBuilder } from '../repair/RepairPromptBuilder.js';
import { RepairRequestBuilder } from '../repair/RepairRequestBuilder.js';
import type { PatchProposal } from '../types/RepairTypes.js';
import type { RealProjectTrialErrorFinding } from '../types/RealProjectTrialTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const projectRoot = resolve('.runtime/fake-llm-repair-provider-test-project');
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
  return <section>Fixed by fake LLM</section>;
}
`;

await writeFile(join(projectRoot, targetFile), currentContent, 'utf8');

const findings: RealProjectTrialErrorFinding[] = [
  {
    id: 'finding-1',
    source: 'typescript-direct',
    message: 'src/components/Broken.tsx(2,10): error TS1382: Unexpected token.',
    relatedFile: targetFile,
    line: 2,
    column: 10,
    severity: 'error',
  },
];

const contextBuilder = new RepairContextBuilder();
const requestBuilder = new RepairRequestBuilder();
const promptBuilder = new RepairPromptBuilder();

const targetFiles = await contextBuilder.build({
  projectRoot,
  targetFiles: [targetFile],
  findings,
});

const request = requestBuilder.build({
  objective: 'Fix the broken component.',
  projectRoot,
  findings,
  targetFiles,
});

const prompt = promptBuilder.build(request);

const proposalFactory = (): PatchProposal => {
  return {
    id: 'fake-provider-test-proposal',
    summary: 'Fix broken component text.',
    riskLevel: 'low',
    operations: [
      {
        kind: 'replace_file',
        targetFile,
        expectedCurrentContent: currentContent,
        newContent,
        reason: 'Replace broken output with deterministic fake provider output.',
      },
    ],
    explanation: 'Fake provider validates model-like output through PatchProposalParser.',
  };
};

const jsonOnlyProvider = new FakeLlmRepairProposalProvider({
  mode: 'json_only',
  proposalFactory,
});

const jsonOnlyResult = await jsonOnlyProvider.propose({
  request,
  prompt,
});

assert(
  jsonOnlyResult.proposal.id === 'fake-provider-test-proposal',
  'Expected JSON-only proposal.',
);
assert(jsonOnlyResult.modelUsage?.provider === 'fake-llm', 'Expected fake provider usage.');
assert(
  jsonOnlyResult.modelUsage !== undefined && jsonOnlyResult.modelUsage.totalTokens > 0,
  'Expected estimated token usage.',
);

const markdownProvider = new FakeLlmRepairProposalProvider({
  mode: 'markdown_json',
  proposalFactory,
});

const markdownResult = await markdownProvider.propose({
  request,
  prompt,
});

assert(
  markdownResult.proposal.id === 'fake-provider-test-proposal',
  'Expected markdown JSON proposal.',
);

const textAroundProvider = new FakeLlmRepairProposalProvider({
  mode: 'text_around_json',
  proposalFactory,
});

const textAroundResult = await textAroundProvider.propose({
  request,
  prompt,
});

assert(
  textAroundResult.proposal.id === 'fake-provider-test-proposal',
  'Expected text-around-JSON proposal.',
);

const strictMarkdownProvider = new FakeLlmRepairProposalProvider({
  mode: 'markdown_json',
  proposalFactory,
  allowJsonExtraction: false,
});

await assertRejects(
  () =>
    strictMarkdownProvider.propose({
      request,
      prompt,
    }),
  'Expected strict markdown fake provider response to fail.',
);

const invalidJsonProvider = new FakeLlmRepairProposalProvider({
  mode: 'invalid_json',
});

await assertRejects(
  () =>
    invalidJsonProvider.propose({
      request,
      prompt,
    }),
  'Expected invalid JSON fake provider response to fail.',
);

const invalidSchemaProvider = new FakeLlmRepairProposalProvider({
  mode: 'invalid_schema',
});

await assertRejects(
  () =>
    invalidSchemaProvider.propose({
      request,
      prompt,
    }),
  'Expected invalid schema fake provider response to fail.',
);

await rm(projectRoot, {
  recursive: true,
  force: true,
});

console.log(
  JSON.stringify({
    message: 'Fake LLM repair proposal provider test completed',
    jsonOnlyProposal: jsonOnlyResult.proposal.id,
    markdownProposal: markdownResult.proposal.id,
    textAroundProposal: textAroundResult.proposal.id,
    modelUsage: jsonOnlyResult.modelUsage,
  }),
);

async function assertRejects(action: () => Promise<unknown>, message: string): Promise<void> {
  try {
    await action();
  } catch {
    return;
  }

  throw new Error(message);
}
