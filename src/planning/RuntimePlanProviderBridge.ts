import { z } from 'zod';
import type { ProviderManager } from '../providers/ProviderManager.js';
import type { ProviderName, ProviderUsage } from '../types/ProviderTypes.js';
import type {
  RuntimePlan,
  RuntimePlanGenerationInput,
  RuntimePlanGenerationResult,
  RuntimePlanRiskLevel,
  RuntimePlanStatus,
} from './RuntimePlan.js';
import { PlanPolicyValidator } from './PlanPolicyValidator.js';

const riskLevelSchema = z.enum(['low', 'medium', 'high']);

const candidateFileSchema = z
  .object({
    path: z.string().min(1).max(300),
    reason: z.string().min(5).max(500),
    existsKnown: z.boolean(),
  })
  .strict();

const riskSchema = z
  .object({
    code: z.string().min(2).max(80),
    level: riskLevelSchema,
    message: z.string().min(5).max(500),
    mitigation: z.string().min(5).max(500),
  })
  .strict();

const stepSchema = z
  .object({
    id: z.string().min(1).max(80),
    kind: z.enum([
      'inspect',
      'context',
      'question',
      'snapshot',
      'plan',
      'patch',
      'approval',
      'verify',
      'report',
    ]),
    title: z.string().min(3).max(160),
    description: z.string().min(5).max(700),
    requiresApproval: z.boolean(),
  })
  .strict();

const verifyCommandSchema = z
  .object({
    command: z.enum(['npm', 'tsc']),
    args: z.array(z.string().min(1).max(80)).max(8),
    reason: z.string().min(5).max(500),
    requiresApproval: z.literal(true),
  })
  .strict();

const providerRuntimePlanSchema = z
  .object({
    objective: z.string().min(5).max(700),
    scope: z
      .object({
        summary: z.string().min(10).max(900),
        includedAreas: z.array(z.string().min(1).max(160)).min(1).max(20),
        excludedAreas: z.array(z.string().min(1).max(180)).min(1).max(20),
        candidateFiles: z.array(candidateFileSchema).min(1).max(30),
      })
      .strict(),
    steps: z.array(stepSchema).min(1).max(10),
    risks: z.array(riskSchema).min(1).max(12),
    verifyCommands: z.array(verifyCommandSchema).max(6),
    needsSnapshot: z.boolean(),
    requiresApproval: z.boolean(),
    riskLevel: riskLevelSchema,
  })
  .strict();

type ProviderRuntimePlanOutput = z.infer<typeof providerRuntimePlanSchema>;

export interface RuntimePlanProviderBridgeOptions {
  providerManager: ProviderManager;
  providerName?: ProviderName | undefined;
  model: string;
  validator?: PlanPolicyValidator | undefined;
}

export interface RuntimePlanProviderBridgeInput extends RuntimePlanGenerationInput {
  runtimeContext?: string | undefined;
}

export interface RuntimePlanProviderAudit {
  provider: ProviderName;
  model: string;
  usage?: ProviderUsage | undefined;
  generatedAt: string;
}

export interface RuntimePlanProviderBridgeResult {
  result: RuntimePlanGenerationResult;
  audit: RuntimePlanProviderAudit;
}

export class RuntimePlanProviderBridge {
  private readonly providerManager: ProviderManager;
  private readonly providerName: ProviderName;
  private readonly model: string;
  private readonly validator: PlanPolicyValidator;

  public constructor(options: RuntimePlanProviderBridgeOptions) {
    this.providerManager = options.providerManager;
    this.providerName = options.providerName ?? 'openrouter';
    this.model = options.model;
    this.validator = options.validator ?? new PlanPolicyValidator();
  }

  public async generate(
    input: RuntimePlanProviderBridgeInput,
  ): Promise<RuntimePlanProviderBridgeResult> {
    const response = await this.providerManager.completeJson(
      this.providerName,
      {
        model: this.model,
        temperature: 0,
        maxTokens: 1800,
        responseFormat: 'json',
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(),
          },
          {
            role: 'user',
            content: this.buildUserPrompt(input),
          },
        ],
      },
      providerRuntimePlanSchema,
    );

    const plan = this.toRuntimePlan({
      input,
      output: response.parsed,
    });

    const validation = this.validator.validate(plan);
    const status: RuntimePlanStatus = validation.valid ? 'validated' : 'rejected';

    return {
      result: {
        plan: {
          ...plan,
          status,
        },
        validation,
      },
      audit: {
        provider: this.providerName,
        model: response.model,
        ...(response.usage ? { usage: response.usage } : {}),
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private toRuntimePlan(input: {
    input: RuntimePlanProviderBridgeInput;
    output: ProviderRuntimePlanOutput;
  }): RuntimePlan {
    return {
      id: this.createPlanId(),
      sessionId: input.input.sessionId,
      projectRoot: input.input.projectRoot,
      projectName: input.input.projectName,
      objective: input.output.objective.trim(),
      scope: input.output.scope,
      steps: input.output.steps,
      risks: input.output.risks,
      verifyCommands: input.output.verifyCommands,
      needsSnapshot: input.output.needsSnapshot,
      requiresApproval: input.output.requiresApproval,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      riskLevel: input.output.riskLevel as RuntimePlanRiskLevel,
      status: 'generated',
      createdAt: new Date().toISOString(),
    };
  }

  private buildSystemPrompt(): string {
    return [
      'You propose structured runtime plans for Zero Runtime.',
      'Return exactly one valid JSON object.',
      'No markdown. No prose. No comments. No extra keys.',
      'The LLM proposes only; the runtime validates, approves, blocks, persists and decides.',
      'Never include file contents.',
      'Never include secrets.',
      'Never propose touching .env, .git, node_modules, dist, build or .next.',
      'Never propose applying patches directly.',
      'Never propose shell execution beyond safe verify command suggestions.',
      'Verify commands must require approval.',
      'Patch, approval and snapshot steps must require approval.',
    ].join('\n');
  }

  private buildUserPrompt(input: RuntimePlanProviderBridgeInput): string {
    return [
      `Session ID: ${input.sessionId}`,
      `Project name: ${input.projectName}`,
      `Instruction: ${input.instruction}`,
      `Workspace mode: ${input.workspaceMode}`,
      `Stack: ${(input.stack ?? []).join(', ') || 'unknown'}`,
      `Known files: ${this.formatKnownFiles(input.knownFiles ?? [])}`,
      `Runtime context: ${this.safeRuntimeContext(input.runtimeContext ?? '')}`,
      '',
      'Return JSON with this exact shape:',
      JSON.stringify(
        {
          objective: 'string',
          scope: {
            summary: 'string',
            includedAreas: ['string'],
            excludedAreas: ['string'],
            candidateFiles: [
              {
                path: 'src/example.ts',
                reason: 'why this file is relevant',
                existsKnown: true,
              },
            ],
          },
          steps: [
            {
              id: 'step-001',
              kind: 'inspect',
              title: 'Inspect relevant context',
              description: 'Read relevant files before generating a patch proposal.',
              requiresApproval: false,
            },
          ],
          risks: [
            {
              code: 'LOW_RISK_PLANNING_ONLY',
              level: 'low',
              message: 'Planning only.',
              mitigation: 'Runtime validates before any change.',
            },
          ],
          verifyCommands: [
            {
              command: 'npm',
              args: ['run', 'typecheck'],
              reason: 'Validate TypeScript correctness.',
              requiresApproval: true,
            },
          ],
          needsSnapshot: true,
          requiresApproval: true,
          riskLevel: 'medium',
        },
        null,
        2,
      ),
    ].join('\n');
  }

  private formatKnownFiles(files: string[]): string {
    const safeFiles = files
      .map((file) => file.trim().replaceAll('\\', '/'))
      .filter((file) => file.length > 0)
      .filter((file) => !this.isProtectedPath(file))
      .slice(0, 40);

    return safeFiles.length > 0 ? safeFiles.join(', ') : 'none';
  }

  private safeRuntimeContext(context: string): string {
    return context
      .replace(/sk-or-v1-[A-Za-z0-9._~:/+=-]+/g, 'sk-or-v1-[redacted]')
      .replace(/Bearer\s+[A-Za-z0-9._~:/+=-]+/gi, 'Bearer [redacted]')
      .replace(/OPENROUTER_API_KEY\s*=\s*[^\s]+/gi, 'OPENROUTER_API_KEY=[redacted]')
      .slice(0, 2500);
  }

  private isProtectedPath(path: string): boolean {
    const normalized = path.toLowerCase().replaceAll('\\', '/');
    const segments = normalized.split('/');

    return (
      segments.includes('.env') ||
      segments.includes('.git') ||
      segments.includes('node_modules') ||
      segments.includes('dist') ||
      segments.includes('build') ||
      segments.includes('.next') ||
      normalized.endsWith('.env') ||
      normalized.includes('.env.')
    );
  }

  private createPlanId(): string {
    return `provider-runtime-plan-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}`;
  }
}
