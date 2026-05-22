import { ProviderManager } from '../providers/ProviderManager.js';
import { OpenRouterProvider } from '../providers/OpenRouterProvider.js';
import { RuntimePlanProviderBridge } from '../planning/RuntimePlanProviderBridge.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const apiKey = process.env['OPENROUTER_API_KEY'];

if (!apiKey) {
  console.log(
    JSON.stringify(
      {
        status: 'skipped',
        test: 'runtime-plan-openrouter-smoke-test',
        reason: 'OPENROUTER_API_KEY is not configured.',
      },
      null,
      2,
    ),
  );

  process.exit(0);
}

const model = process.env['ZERO_OPENROUTER_MODEL'] ?? 'poolside/laguna-xs.2:free';

const manager = new ProviderManager();

manager.register(
  new OpenRouterProvider({
    apiKey,
    baseUrl: process.env['OPENROUTER_BASE_URL'] ?? 'https://openrouter.ai/api/v1',
  }),
);

const bridge = new RuntimePlanProviderBridge({
  providerManager: manager,
  model,
});

const generated = await bridge.generate({
  sessionId: 'session-84-openrouter-smoke-test',
  projectRoot: '.runtime/runtime-plan-openrouter-smoke-test/project',
  projectName: 'runtime-plan-openrouter-smoke-fixture',
  instruction:
    'Improve the React profile component and backend profile route safely without applying changes yet.',
  workspaceMode: 'local_snapshot',
  stack: ['react', 'express', 'typescript'],
  knownFiles: [
    'src/components/ProfileCard.tsx',
    'src/api/profileApi.ts',
    'src/routes/profileRoutes.ts',
    'src/controllers/profileController.ts',
    '.env',
  ],
  runtimeContext:
    'Use strict TypeScript. Do not touch secrets. Do not apply patches. Only propose a runtime plan.',
});

assert(generated.result.plan.id.length > 0, 'Expected generated plan id.');
assert(
  generated.result.plan.status === 'validated' || generated.result.plan.status === 'rejected',
  'Expected runtime to validate or reject provider plan.',
);
assert(generated.result.plan.steps.length > 0, 'Expected provider plan steps.');
assert(generated.result.plan.risks.length > 0, 'Expected provider plan risks.');
assert(
  generated.result.plan.scope.candidateFiles.every((file) => !file.path.includes('.env')),
  'Provider plan must not include protected .env path.',
);
assert(generated.audit.provider === 'openrouter', 'Expected OpenRouter audit provider.');
assert(generated.audit.model.length > 0, 'Expected audit model.');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-plan-openrouter-smoke-test',
      provider: generated.audit.provider,
      model: generated.audit.model,
      planId: generated.result.plan.id,
      planStatus: generated.result.plan.status,
      riskLevel: generated.result.plan.riskLevel,
      validationValid: generated.result.validation.valid,
      issues: generated.result.validation.issues.map((issue) => issue.code),
      totalTokens: generated.audit.usage?.totalTokens ?? null,
    },
    null,
    2,
  ),
);
