import type { ProviderManager } from '../providers/ProviderManager.js';
import type { RuntimeObjective } from '../types/ObjectiveTypes.js';
import type { RuntimePlan } from '../types/PlanningTypes.js';
import { ZeroRuntimeError } from '../utils/errors.js';
import type { PlanGenerationAttempt, PlanGenerationFailure } from './PlanGenerationAttempt.js';
import { PlanGenerationRetryPolicy } from './PlanGenerationRetryPolicy.js';
import { runtimePlanSchema, type RuntimePlanModelOutput } from './PlanSchemas.js';

export interface PlanGeneratorOptions {
  providerManager: ProviderManager;
  providerName: 'openrouter';
  model: string;
}

export interface GeneratePlanInput {
  objective: RuntimeObjective;
  runtimeContext: string;
}

export class PlanGenerator {
  private readonly providerManager: ProviderManager;
  private readonly providerName: 'openrouter';
  private readonly model: string;
  private readonly retryPolicy = new PlanGenerationRetryPolicy();

  public constructor(options: PlanGeneratorOptions) {
    this.providerManager = options.providerManager;
    this.providerName = options.providerName;
    this.model = options.model;
  }

  public async generate(input: GeneratePlanInput): Promise<RuntimePlan> {
    const parsed = await this.generateWithRetry(input);

    const plan: RuntimePlan = {
      id: this.createPlanId(),
      objectiveId: input.objective.id,
      title: parsed.title,
      summary: parsed.summary,
      riskLevel: parsed.riskLevel,
      steps: parsed.steps,
      createdAt: new Date().toISOString(),
    };

    if (plan.steps.some((step) => step.type === 'run_command' && !step.requiresApproval)) {
      throw new ZeroRuntimeError('Generated plan contains unapproved command steps.', {
        code: 'PLAN_COMMAND_APPROVAL_REQUIRED',
      });
    }

    return plan;
  }

  private async generateWithRetry(input: GeneratePlanInput): Promise<RuntimePlanModelOutput> {
    const attempts = this.createAttempts(input);
    const failures: PlanGenerationFailure[] = [];

    for (const attempt of attempts) {
      try {
        const response = await this.providerManager.completeJson(
          this.providerName,
          {
            model: this.model,
            temperature: 0,
            maxTokens: 1200,
            messages: [
              {
                role: 'system',
                content:
                  'Return one complete valid minified JSON object only. No markdown. No prose. No extra keys. Never omit required fields.',
              },
              {
                role: 'user',
                content: attempt.prompt,
              },
            ],
          },
          runtimePlanSchema,
        );

        return response.parsed;
      } catch (error) {
        const failureKind = this.retryPolicy.classify(error);

        const retryDecision = this.retryPolicy.shouldRetry({
          failureKind,
          attemptIndex: attempt.index,
          maxAttempts: attempts.length,
        });

        failures.push({
          attempt: {
            index: attempt.index,
            kind: attempt.kind,
          },
          kind: failureKind,
          retryable: retryDecision.retry,
          error: this.serializeError(error),
        });

        if (!retryDecision.retry) {
          throw new ZeroRuntimeError('Plan generation failed by retry policy.', {
            code: 'PLAN_GENERATION_REJECTED_BY_RETRY_POLICY',
            cause: {
              reason: retryDecision.reason,
              failures,
            },
          });
        }
      }
    }

    throw new ZeroRuntimeError('Plan generation failed after all retry attempts.', {
      code: 'PLAN_GENERATION_RETRIES_EXHAUSTED',
      cause: {
        failures,
      },
    });
  }

  private createAttempts(input: GeneratePlanInput): PlanGenerationAttempt[] {
    return [
      {
        index: 0,
        kind: 'primary',
        prompt: this.buildPrompt(input, false),
      },
      {
        index: 1,
        kind: 'repair',
        prompt: this.buildPrompt(input, true),
      },
    ];
  }

  private buildPrompt(input: GeneratePlanInput, repairMode: boolean): string {
    const compactContext = input.runtimeContext.trim().slice(0, 700);

    return `${repairMode ? 'Previous output failed schema validation. Retry with complete JSON. Include every required field in every step.\n' : ''}Objective: ${input.objective.normalizedObjective}
Module: ${input.objective.module}

Return JSON matching this exact shape:
{"title":"string","summary":"string","riskLevel":"low","steps":[{"id":"step-001","type":"create_file","title":"string","description":"string","target":".runtime/loop-tests/file.txt","expectedOutcome":"string","requiresApproval":true,"toolIntent":{"toolName":"create_file","input":{"target":".runtime/loop-tests/file.txt","content":"string","overwrite":false}}}]}

Hard rules:
- JSON only.
- One complete object.
- No markdown.
- No prose.
- No extra keys.
- Exactly 1 to 3 steps.
- Every step must include id, type, title, description, expectedOutcome, requiresApproval.
- Executable filesystem steps must include toolIntent.
- toolIntent.toolName must match the intended runtime tool.
- inspect steps should use read_file.
- create_file steps should use create_file.
- edit_file steps should use edit_file and include diffConfirmed true.
- Never use run_command.
- Never target .env, .git, node_modules, dist.
- Prefer safe targets under .runtime/loop-tests when the objective is a test/demo.
- Do not include shell commands.
- Do not include git operations.
- Do not include network operations.
- The runtime validates and executes; the model only proposes.

Allowed toolIntent examples:
{"toolName":"read_file","input":{"target":"src/core/AgentRuntime.ts","maxBytes":64000}}
{"toolName":"create_file","input":{"target":".runtime/loop-tests/runtime-loop-created.txt","content":"Created by Runtime Loop v1.\\n","overwrite":false}}
{"toolName":"edit_file","input":{"target":".runtime/loop-tests/runtime-loop-created.txt","newContent":"Updated by Runtime Loop v1.\\n","diffConfirmed":true}}

Context:
${compactContext}`;
  }

  private serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof ZeroRuntimeError) {
      const serialized: Record<string, unknown> = {
        name: error.name,
        code: error.code,
        message: error.message,
      };

      if (error.cause !== undefined) {
        serialized['cause'] = error.cause;
      }

      return serialized;
    }

    if (error instanceof Error) {
      const serialized: Record<string, unknown> = {
        name: error.name,
        message: error.message,
      };

      if (error.stack !== undefined) {
        serialized['stack'] = error.stack;
      }

      return serialized;
    }

    return {
      message: String(error),
    };
  }

  private createPlanId(): string {
    return `plan-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}`;
  }
}
