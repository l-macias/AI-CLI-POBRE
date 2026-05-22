import { ProviderManager } from '../providers/ProviderManager.js';
import { RuntimePlanProviderBridge } from '../planning/RuntimePlanProviderBridge.js';
import type { Provider, ProviderRequest, ProviderResponse } from '../types/ProviderTypes.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

class FakePlanProvider implements Provider {
  public readonly name = 'openrouter' as const;

  // eslint-disable-next-line @typescript-eslint/require-await
  public async complete(request: ProviderRequest): Promise<ProviderResponse> {
    assert(request.responseFormat === 'json', 'Expected JSON response format.');
    assert(request.messages.length === 2, 'Expected system and user messages.');

    const userPrompt = request.messages.map((message) => message.content).join('\n');

    assert(!userPrompt.includes('OPENROUTER_API_KEY=secret'), 'Prompt should redact API keys.');
    const knownFilesLine = userPrompt.split('\n').find((line) => line.startsWith('Known files:'));

    assert(knownFilesLine !== undefined, 'Expected known files line.');
    assert(!knownFilesLine?.includes('.env'), 'Known files should not include protected file.');

    return {
      id: 'fake-plan-response-001',
      model: request.model,
      content: JSON.stringify({
        objective:
          'Improve auth token handling and profile API safety without applying changes yet.',
        scope: {
          summary:
            'Provider proposed a structured runtime plan focused on auth and profile API safety.',
          includedAreas: ['backend', 'auth', 'profile api'],
          excludedAreas: [
            '.env and secret files',
            'node_modules',
            '.git internals',
            'direct database migrations',
          ],
          candidateFiles: [
            {
              path: 'src/auth/auth.service.ts',
              reason: 'Auth token handling is relevant to the instruction.',
              existsKnown: true,
            },
            {
              path: 'src/routes/profileRoutes.ts',
              reason: 'Profile API routing is relevant to the instruction.',
              existsKnown: true,
            },
          ],
        },
        steps: [
          {
            id: 'step-001',
            kind: 'inspect',
            title: 'Inspect auth and profile API context',
            description:
              'Read only relevant auth and profile API files before proposing any patch.',
            requiresApproval: false,
          },
          {
            id: 'step-002',
            kind: 'snapshot',
            title: 'Create local snapshot',
            description: 'Create a local snapshot before any patch proposal can move toward apply.',
            requiresApproval: true,
          },
          {
            id: 'step-003',
            kind: 'patch',
            title: 'Generate patch proposal',
            description:
              'Generate a patch proposal only after runtime validation accepts the plan.',
            requiresApproval: true,
          },
          {
            id: 'step-004',
            kind: 'approval',
            title: 'Request user approval',
            description: 'Require explicit user approval before any apply step.',
            requiresApproval: true,
          },
          {
            id: 'step-005',
            kind: 'verify',
            title: 'Run safe verification',
            description: 'Run approved verification after the user accepts the proposal.',
            requiresApproval: true,
          },
        ],
        risks: [
          {
            code: 'AUTH_SECURITY_TOUCHPOINT',
            level: 'medium',
            message: 'The instruction touches authentication-sensitive logic.',
            mitigation: 'Require snapshot, review and approval before any patch is applied.',
          },
        ],
        verifyCommands: [
          {
            command: 'npm',
            args: ['run', 'typecheck'],
            reason: 'Validate TypeScript correctness after reviewed changes.',
            requiresApproval: true,
          },
        ],
        needsSnapshot: true,
        requiresApproval: true,
        riskLevel: 'medium',
      }),
      usage: {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      },
      raw: {},
    };
  }
}

class UnsafePlanProvider implements Provider {
  public readonly name = 'openrouter' as const;

  // eslint-disable-next-line @typescript-eslint/require-await
  public async complete(request: ProviderRequest): Promise<ProviderResponse> {
    return {
      id: 'fake-plan-response-unsafe',
      model: request.model,
      content: JSON.stringify({
        objective: 'Modify environment configuration.',
        scope: {
          summary: 'Unsafe provider proposal that should be rejected by runtime policy validation.',
          includedAreas: ['environment'],
          excludedAreas: ['node_modules'],
          candidateFiles: [
            {
              path: '.env',
              reason: 'Provider tried to include a protected file.',
              existsKnown: true,
            },
          ],
        },
        steps: [
          {
            id: 'step-001',
            kind: 'inspect',
            title: 'Inspect environment file',
            description: 'Attempt to inspect protected environment configuration.',
            requiresApproval: false,
          },
        ],
        risks: [
          {
            code: 'SENSITIVE_FILE_CANDIDATE',
            level: 'high',
            message: 'The plan includes a protected file.',
            mitigation: 'Runtime must reject protected path proposals.',
          },
        ],
        verifyCommands: [
          {
            command: 'npm',
            args: ['run', 'typecheck'],
            reason: 'Validate TypeScript.',
            requiresApproval: true,
          },
        ],
        needsSnapshot: true,
        requiresApproval: true,
        riskLevel: 'high',
      }),
      raw: {},
    };
  }
}

const manager = new ProviderManager();
manager.register(new FakePlanProvider());

const bridge = new RuntimePlanProviderBridge({
  providerManager: manager,
  model: 'poolside/laguna-xs.2:free',
});

const valid = await bridge.generate({
  sessionId: 'session-84-provider-plan-test',
  projectRoot: '.runtime/runtime-plan-provider-bridge-test/project',
  projectName: 'provider-plan-fixture',
  instruction: 'Improve auth token handling and profile API safety without applying changes yet.',
  workspaceMode: 'local_snapshot',
  stack: ['react', 'express', 'typescript'],
  knownFiles: ['src/auth/auth.service.ts', 'src/routes/profileRoutes.ts', '.env'],
  runtimeContext: 'OPENROUTER_API_KEY=secret',
});

assert(valid.result.validation.valid, 'Expected provider plan to be valid.');
assert(valid.result.plan.status === 'validated', 'Expected provider plan to be validated.');
assert(valid.result.plan.riskLevel === 'medium', 'Expected medium risk plan.');
assert(valid.result.plan.needsSnapshot, 'Expected snapshot requirement.');
assert(valid.result.plan.requiresApproval, 'Expected approval requirement.');
assert(valid.audit.provider === 'openrouter', 'Expected provider audit.');
assert(valid.audit.model === 'poolside/laguna-xs.2:free', 'Expected model audit.');
assert(valid.audit.usage?.totalTokens === 300, 'Expected usage audit.');

const unsafeManager = new ProviderManager();
unsafeManager.register(new UnsafePlanProvider());

const unsafeBridge = new RuntimePlanProviderBridge({
  providerManager: unsafeManager,
  model: 'poolside/laguna-xs.2:free',
});

const unsafe = await unsafeBridge.generate({
  sessionId: 'session-84-provider-plan-unsafe-test',
  projectRoot: '.runtime/runtime-plan-provider-bridge-test/project',
  projectName: 'provider-plan-fixture',
  instruction: 'Modify environment configuration.',
  workspaceMode: 'local_snapshot',
  stack: ['typescript'],
  knownFiles: ['.env'],
});

assert(!unsafe.result.validation.valid, 'Expected unsafe provider plan to be invalid.');
assert(unsafe.result.plan.status === 'rejected', 'Expected unsafe provider plan to be rejected.');
assert(
  unsafe.result.validation.issues.some((issue) => issue.code === 'PROTECTED_PATH_NOT_ALLOWED'),
  'Expected protected path issue.',
);

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'runtime-plan-provider-bridge-test',
      validPlanId: valid.result.plan.id,
      validStatus: valid.result.plan.status,
      validRiskLevel: valid.result.plan.riskLevel,
      provider: valid.audit.provider,
      model: valid.audit.model,
      totalTokens: valid.audit.usage?.totalTokens ?? null,
      unsafeStatus: unsafe.result.plan.status,
      unsafeIssues: unsafe.result.validation.issues.map((issue) => issue.code),
    },
    null,
    2,
  ),
);
