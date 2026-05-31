import { z } from 'zod';
import { GeneratedPathPolicy } from '../projects/GeneratedPathPolicy.js';
import type { AppliedDecisionContext } from '../interactive/SessionDecision.js';
import type { ProviderName, ProviderUsage } from '../types/ProviderTypes.js';
import type { ProviderManager } from '../providers/ProviderManager.js';
import type {
  RuntimePlan,
  RuntimePlanGenerationInput,
  RuntimePlanGenerationResult,
  RuntimePlanMode,
  RuntimePlanStatus,
  RuntimePlanStep,
} from './RuntimePlan.js';
import { PlanPolicyValidator } from './PlanPolicyValidator.js';

const riskLevelSchema = z.enum(['low', 'medium', 'high']);

const providerStepKindValues = [
  'inspect',
  'context',
  'question',
  'snapshot',
  'plan',
  'patch',
  'approval',
  'verify',
  'report',
] as const;

type ProviderStepKind = RuntimePlanStep['kind'];

const providerStepKindAliasValues = [
  'analyze',
  'analysis',
  'ask',
  'propose',
  'proposal',
  'approve',
  'validate',
  'test',
  'summarize',
] as const;

type ProviderStepKindAlias = (typeof providerStepKindAliasValues)[number];
type ProviderStepKindInput = ProviderStepKind | ProviderStepKindAlias;

const stepKindAliases: Record<ProviderStepKindAlias, ProviderStepKind> = {
  analyze: 'inspect',
  analysis: 'inspect',
  ask: 'question',
  propose: 'patch',
  proposal: 'patch',
  approve: 'approval',
  validate: 'verify',
  test: 'verify',
  summarize: 'report',
};

const providerStepKindSchema = z.union([
  z.enum(providerStepKindValues),
  z.enum(providerStepKindAliasValues),
]);

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
    kind: providerStepKindSchema,
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
        candidateFiles: z.array(candidateFileSchema).max(30),
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
  private readonly generatedPathPolicy = new GeneratedPathPolicy();

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
            content: this.buildSystemPrompt(input),
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
    const mode = this.resolveMode(input.input);
    const normalizedOutput =
      mode === 'read_only' ? this.normalizeReadOnlyOutput(input.output) : input.output;

    return {
      id: this.createPlanId(),
      sessionId: input.input.sessionId,
      projectRoot: input.input.projectRoot,
      projectName: input.input.projectName,
      objective: normalizedOutput.objective.trim(),
      mode,
      scope: this.normalizeProviderScope({
        input: input.input,
        output: normalizedOutput,
        mode,
      }),
      steps: normalizedOutput.steps.map((step) => ({
        ...step,
        kind: this.normalizeProviderStepKind(step.kind),
      })),
      risks: normalizedOutput.risks,
      verifyCommands: mode === 'read_only' ? [] : normalizedOutput.verifyCommands,
      needsSnapshot: mode === 'read_only' ? false : normalizedOutput.needsSnapshot,
      requiresApproval: mode === 'read_only' ? false : normalizedOutput.requiresApproval,
      riskLevel: mode === 'read_only' ? 'low' : normalizedOutput.riskLevel,
      status: 'generated',
      createdAt: new Date().toISOString(),
    };
  }

  private normalizeReadOnlyOutput(output: ProviderRuntimePlanOutput): ProviderRuntimePlanOutput {
    const safeSteps = output.steps.filter((step) => {
      const kind = this.normalizeProviderStepKind(step.kind);

      return kind !== 'patch' && kind !== 'approval' && kind !== 'snapshot' && kind !== 'verify';
    });

    const fallbackSteps: ProviderRuntimePlanOutput['steps'] = [
      {
        id: 'step-001',
        kind: 'inspect',
        title: 'Inspect source structure',
        description: 'Inspect source files and project configuration without writes.',
        requiresApproval: false,
      },
      {
        id: 'step-002',
        kind: 'context',
        title: 'Analyze project boundaries',
        description: 'Analyze relevant project boundaries in read-only mode.',
        requiresApproval: false,
      },
      {
        id: 'step-003',
        kind: 'plan',
        title: 'Produce recommendations',
        description: 'Produce findings and recommendations only.',
        requiresApproval: false,
      },
      {
        id: 'step-004',
        kind: 'report',
        title: 'Export analysis report',
        description: 'Export read-only analysis report.',
        requiresApproval: false,
      },
    ];

    return {
      ...output,
      steps: safeSteps.length > 0 ? safeSteps : fallbackSteps,
      verifyCommands: [],
      needsSnapshot: false,
      requiresApproval: false,
      riskLevel: 'low',
      risks: output.risks.map((risk) => ({
        ...risk,
        level: 'low',
        mitigation:
          risk.mitigation.trim().length > 0
            ? risk.mitigation
            : 'Keep the result informational and require a new explicit patch objective for changes.',
      })),
    };
  }

  private resolveMode(input: RuntimePlanProviderBridgeInput): RuntimePlanMode {
    const instruction = input.instruction.toLowerCase();
    const workspaceMode = input.workspaceMode.toLowerCase();

    if (workspaceMode === 'local_patchless') {
      return 'read_only';
    }

    if (
      this.containsAny(instruction, [
        'read-only',
        'readonly',
        'read only',
        'analysis only',
        'recommendations only',
        'recommendation only',
        'solo lectura',
        'solo analizar',
        'solo recomendaciones',
        'do not generate patches',
        'do not generate patch',
        'do not apply files',
        'do not apply',
        'do not create snapshots',
        'do not create snapshot',
        'without modifying',
        'without changes',
        'no file changes',
        'no patches',
        'no patch',
        'audit only',
      ])
    ) {
      return 'read_only';
    }

    return 'patch';
  }

  private normalizeProviderStepKind(kind: ProviderStepKindInput): ProviderStepKind {
    const alias = this.resolveProviderStepKindAlias(kind);

    if (alias) {
      return alias;
    }

    if (this.isProviderStepKind(kind)) {
      return kind;
    }

    throw new Error(`Unsupported provider step kind: ${kind}`);
  }

  private normalizeProviderScope(input: {
    input: RuntimePlanProviderBridgeInput;
    output: ProviderRuntimePlanOutput;
    mode: RuntimePlanMode;
  }): RuntimePlan['scope'] {
    return {
      ...input.output.scope,
      summary:
        input.mode === 'read_only'
          ? `Read-only provider plan generated with ${input.output.scope.candidateFiles.length} context file(s).`
          : input.output.scope.summary,
      excludedAreas: [
        ...input.output.scope.excludedAreas,
        ...(input.mode === 'read_only'
          ? [
              'patch proposal generation',
              'file apply operations',
              'snapshot creation for write flow',
              'patch verification commands',
            ]
          : []),
        ...this.renderAppliedBlockedAreas(input.input.appliedDecisionContext),
      ],
      candidateFiles: this.normalizeCandidateFiles(input),
    };
  }

  private normalizeCandidateFiles(input: {
    input: RuntimePlanProviderBridgeInput;
    output: ProviderRuntimePlanOutput;
  }): RuntimePlan['scope']['candidateFiles'] {
    const providerFiles = input.output.scope.candidateFiles.filter((candidate) => {
      return this.isAllowedCandidatePath(candidate.path, input.input.appliedDecisionContext);
    });

    if (providerFiles.length > 0) {
      return providerFiles;
    }

    return this.buildFallbackCandidateFiles(input.input);
  }

  private isAllowedCandidatePath(
    filePath: string,
    appliedDecisionContext: AppliedDecisionContext | undefined,
  ): boolean {
    if (this.generatedPathPolicy.isGeneratedPath(filePath)) {
      return false;
    }

    return !this.isBlockedByDecisionContext(filePath, appliedDecisionContext);
  }

  private isBlockedByDecisionContext(
    filePath: string,
    appliedDecisionContext: AppliedDecisionContext | undefined,
  ): boolean {
    const blockedPatterns = appliedDecisionContext?.blockedPathPatterns ?? [];

    if (blockedPatterns.length === 0) {
      return false;
    }

    const normalized = filePath.toLowerCase().replaceAll('\\', '/');

    return blockedPatterns.some((pattern) => {
      const normalizedPattern = pattern.toLowerCase().replaceAll('\\', '/').replace(/^\/+/, '');

      return (
        normalized === normalizedPattern ||
        normalized.startsWith(`${normalizedPattern}/`) ||
        normalized.includes(`/${normalizedPattern}/`) ||
        normalized.includes(`/${normalizedPattern}`)
      );
    });
  }

  private renderAppliedBlockedAreas(
    appliedDecisionContext: AppliedDecisionContext | undefined,
  ): string[] {
    if (!appliedDecisionContext) {
      return [];
    }

    return [
      ...appliedDecisionContext.blockedScopes.map((scope) => `blocked scope from memory: ${scope}`),
      ...appliedDecisionContext.blockedPathPatterns.map(
        (pattern) => `blocked path from memory: ${pattern}`,
      ),
    ];
  }

  private resolveProviderStepKindAlias(kind: ProviderStepKindInput): ProviderStepKind | null {
    if (this.isProviderStepKindAlias(kind)) {
      return stepKindAliases[kind];
    }

    return null;
  }

  private isProviderStepKind(kind: string): kind is ProviderStepKind {
    return providerStepKindValues.some((value) => value === kind);
  }

  private isProviderStepKindAlias(kind: string): kind is ProviderStepKindAlias {
    return providerStepKindAliasValues.some((value) => value === kind);
  }

  private buildFallbackCandidateFiles(
    input: RuntimePlanProviderBridgeInput,
  ): RuntimePlan['scope']['candidateFiles'] {
    const knownFiles = input.knownFiles ?? [];
    const safeKnownFiles = knownFiles
      .map((file) => file.trim().replaceAll('\\', '/'))
      .filter((file) => file.length > 0)
      .filter((file) => !this.isProtectedPath(file))
      .filter((file) => this.isAllowedCandidatePath(file, input.appliedDecisionContext));

    if (safeKnownFiles.length > 0) {
      return [...new Set(safeKnownFiles)].slice(0, 12).map((file) => ({
        path: file,
        reason: 'Provided by runtime context as a known relevant file.',
        existsKnown: true,
      }));
    }

    return [
      {
        path: 'src',
        reason:
          'Fallback safe source directory selected because no safe known files were provided.',
        existsKnown: false,
      },
    ];
  }

  private buildSystemPrompt(input: RuntimePlanProviderBridgeInput): string {
    const mode = this.resolveMode(input);

    return [
      'You are Zero Runtime plan generator.',
      'Return only valid JSON matching the provided schema.',
      'The runtime is the authority: you propose, the runtime validates and decides.',
      'Prefer source files, app/pages/components/api routes/config files and package scripts.',
      'Never propose touching .env, .git, node_modules, dist, build, out, .next, .open-next, .cache, .turbo, .vercel, coverage or generated output folders.',
      'Never propose unsafe commands.',
      'Every verification command requires approval.',
      'Use allowed step kinds only: inspect, context, question, snapshot, plan, patch, approval, verify, report.',
      'Session memory hard rules are executable runtime policy. Treat blocked paths and scopes as forbidden.',
      ...(mode === 'read_only'
        ? [
            'This is a read-only objective.',
            'Do not generate patch, approval, snapshot, apply, sandbox, recovery or patch verification steps.',
            'Produce analysis and recommendations only.',
          ]
        : []),
    ].join('\n');
  }

  private buildUserPrompt(input: RuntimePlanProviderBridgeInput): string {
    const mode = this.resolveMode(input);

    return [
      `Project: ${input.projectName}`,
      `Project root: ${input.projectRoot}`,
      `Workspace mode: ${input.workspaceMode}`,
      `Plan mode: ${mode}`,
      `Objective: ${input.instruction}`,
      `Stack: ${(input.stack ?? []).join(', ') || 'unknown'}`,
      '',
      'Known files:',
      this.formatKnownFiles(input.knownFiles ?? [], input.appliedDecisionContext),
      '',
      'Applied session memory policy:',
      this.renderAppliedDecisionContext(input.appliedDecisionContext),
      '',
      'Runtime context:',
      input.runtimeContext?.trim() || 'No runtime context provided.',
      '',
      mode === 'read_only'
        ? 'Generate a read-only analysis plan. Do not include patch/snapshot/approval/verify-for-patch steps.'
        : 'Generate a safe runtime plan. Do not include generated output folders or memory-blocked paths as candidate files.',
    ].join('\n');
  }

  private formatKnownFiles(
    files: string[],
    appliedDecisionContext: AppliedDecisionContext | undefined,
  ): string {
    const safeFiles = files
      .map((file) => file.trim().replaceAll('\\', '/'))
      .filter((file) => file.length > 0)
      .filter((file) => !this.isProtectedPath(file))
      .filter((file) => this.isAllowedCandidatePath(file, appliedDecisionContext));

    if (safeFiles.length === 0) {
      return '- none';
    }

    return [...new Set(safeFiles)]
      .slice(0, 40)
      .map((file) => `- ${file}`)
      .join('\n');
  }

  private renderAppliedDecisionContext(
    appliedDecisionContext: AppliedDecisionContext | undefined,
  ): string {
    if (!appliedDecisionContext) {
      return '- none';
    }

    return [
      `- requiresApproval: ${String(appliedDecisionContext.requiresApproval)}`,
      `- securityStrict: ${String(appliedDecisionContext.securityStrict)}`,
      `- blockedScopes: ${appliedDecisionContext.blockedScopes.join(', ') || 'none'}`,
      `- blockedPathPatterns: ${appliedDecisionContext.blockedPathPatterns.join(', ') || 'none'}`,
      `- codingRules: ${appliedDecisionContext.codingRules.join(' | ') || 'none'}`,
      `- notes: ${appliedDecisionContext.notes.join(' | ') || 'none'}`,
    ].join('\n');
  }

  private isProtectedPath(filePath: string): boolean {
    const normalized = filePath.toLowerCase().replaceAll('\\', '/');
    const segments = normalized.split('/');

    if (this.generatedPathPolicy.isGeneratedPath(filePath)) {
      return true;
    }

    if (normalized.startsWith('.env') || normalized.includes('/.env')) {
      return true;
    }

    return segments.includes('.git') || segments.includes('node_modules');
  }

  private containsAny(value: string, terms: string[]): boolean {
    return terms.some((term) => value.includes(term));
  }

  private createPlanId(): string {
    return `runtime-plan-provider-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}`;
  }
}
