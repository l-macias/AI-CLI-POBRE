import { OpenRouterClient } from '../providers/OpenRouterClient.js';
import { OpenRouterConfigLoader } from '../providers/OpenRouterConfigLoader.js';
import { OpenRouterRepairProposalProvider } from '../repair/OpenRouterRepairProposalProvider.js';
import { PatchSafetyValidator } from '../repair/PatchSafetyValidator.js';
import type { RepairRequest } from '../types/RepairTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function shouldRunRealProviderSmokeTest(): boolean {
  return process.env['ZERO_RUN_REAL_PROVIDER_TEST'] === '1';
}

function createSmokeRepairRequest(): RepairRequest {
  return {
    id: 'repair-openrouter-smoke-request-001',
    objective:
      'Return a minimal safe patch proposal that keeps the target file unchanged for smoke testing.',
    projectRoot: '/tmp/zero-runtime-openrouter-smoke',
    targetFiles: [
      {
        relativePath: 'src/smoke-example.ts',
        exists: true,
        content: 'export const smokeValue = 1;\n',
        bytes: 29,
      },
    ],
    findings: [
      {
        source: 'smoke-test',
        severity: 'warning',
        message: 'Smoke test asks provider to return a safe no-op or equivalent patch proposal.',
        relatedFile: 'src/smoke-example.ts',
        id: '',
      },
    ],
    constraints: [
      {
        code: 'SMOKE_TEST_NO_DESTRUCTIVE_CHANGES',
        description:
          'The provider must not delete files, introduce secrets, or modify unrelated files.',
        severity: 'error',
      },
      {
        code: 'SMOKE_TEST_JSON_ONLY',
        description:
          'The provider should return only a JSON PatchProposal object with no prose outside JSON.',
        severity: 'error',
      },
    ],
    expectedOutput: {
      format: 'json_patch_proposal',
      allowedOperations: ['replace_file', 'edit_file', 'create_file', 'delete_file'],
      requireExplanation: true,
      requireRiskAssessment: true,
    },
  };
}

function createSmokePrompt(request: RepairRequest): string {
  const target = request.targetFiles[0];

  if (!target) {
    throw new Error('Smoke request must include one target file.');
  }

  return [
    'You are being tested by Zero Runtime.',
    'Return only a JSON object matching this TypeScript shape:',
    '{',
    '  "id": "string",',
    '  "summary": "string",',
    '  "riskLevel": "low" | "medium" | "high",',
    '  "operations": [',
    '    {',
    '      "kind": "replace_file" | "edit_file" | "create_file" | "delete_file",',
    '      "targetFile": "string",',
    '      "expectedCurrentContent": "string",',
    '      "newContent": "string",',
    '      "reason": "string"',
    '    }',
    '  ],',
    '  "explanation": "string"',
    '}',
    '',
    'Important constraints:',
    '- Do not use markdown fences.',
    '- Do not include prose outside JSON.',
    '- Do not delete files.',
    '- Do not introduce secrets.',
    '- Keep the operation low risk.',
    '- Use the exact target file path.',
    '- Use expectedCurrentContent exactly as provided.',
    '- Prefer keeping newContent identical to current content for this smoke test.',
    '',
    `Objective: ${request.objective}`,
    '',
    `Target file: ${target.relativePath}`,
    '',
    'Current content:',
    target.content,
  ].join('\n');
}

if (!shouldRunRealProviderSmokeTest()) {
  console.info(
    JSON.stringify(
      {
        status: 'skipped',
        test: 'repair-openrouter-smoke-test',
        reason:
          'Set ZERO_RUN_REAL_PROVIDER_TEST=1, ZERO_OPENROUTER_ENABLED=1, OPENROUTER_API_KEY, and ZERO_OPENROUTER_MODEL to run the real provider smoke test.',
      },
      null,
      2,
    ),
  );

  process.exit(0);
}

const loader = new OpenRouterConfigLoader();
const config = loader.load({
  requireApiKey: true,
  requireExplicitOptIn: true,
});

if (!config.ok) {
  throw new Error(`OpenRouter smoke test config failed: ${config.error.message}`);
}

const client = new OpenRouterClient({
  config: config.value,
});

const provider = new OpenRouterRepairProposalProvider({
  client,
  model: config.value.defaultModel,
  maxTokens: config.value.maxTokens,
  temperature: 0,
});

const request = createSmokeRepairRequest();
const prompt = createSmokePrompt(request);

const result = await provider.propose({
  request,
  prompt,
});

const validation = new PatchSafetyValidator().validate({
  request,
  proposal: result.proposal,
});

assert(validation.valid, 'Real OpenRouter smoke proposal must pass patch safety validation.');
assert(result.proposal.riskLevel === 'low', 'Real OpenRouter smoke proposal should be low risk.');
assert(result.modelUsage !== undefined, 'Real OpenRouter smoke result should include model usage.');
assert(result.modelUsage?.provider === 'openrouter', 'Model usage provider should be openrouter.');
assert(
  result.modelUsage?.model === config.value.defaultModel,
  'Model usage should preserve configured model.',
);

console.info(
  JSON.stringify(
    {
      status: 'ok',
      test: 'repair-openrouter-smoke-test',
      provider: result.modelUsage?.provider,
      model: result.modelUsage?.model,
      proposalId: result.proposal.id,
      riskLevel: result.proposal.riskLevel,
      operationCount: result.proposal.operations.length,
      patchSafetyValid: validation.valid,
      totalTokens: result.modelUsage?.totalTokens ?? 0,
      estimatedUsd: result.modelUsage?.estimatedUsd ?? 0,
    },
    null,
    2,
  ),
);
