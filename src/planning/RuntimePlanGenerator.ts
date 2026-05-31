import { GeneratedPathPolicy } from '../projects/GeneratedPathPolicy.js';
import type { AppliedDecisionContext } from '../interactive/SessionDecision.js';
import type {
  RuntimePlan,
  RuntimePlanCandidateFile,
  RuntimePlanGenerationInput,
  RuntimePlanGenerationResult,
  RuntimePlanMode,
  RuntimePlanScope,
  RuntimePlanStep,
  RuntimePlanVerifyCommand,
} from './RuntimePlan.js';
import { PlanPolicyValidator } from './PlanPolicyValidator.js';
import { PlanRiskAnalyzer } from './PlanRiskAnalyzer.js';

export interface RuntimePlanGeneratorOptions {
  riskAnalyzer?: PlanRiskAnalyzer | undefined;
  validator?: PlanPolicyValidator | undefined;
}

export class RuntimePlanGenerator {
  private readonly riskAnalyzer: PlanRiskAnalyzer;
  private readonly validator: PlanPolicyValidator;
  private readonly generatedPathPolicy = new GeneratedPathPolicy();

  public constructor(options: RuntimePlanGeneratorOptions = {}) {
    this.riskAnalyzer = options.riskAnalyzer ?? new PlanRiskAnalyzer();
    this.validator = options.validator ?? new PlanPolicyValidator();
  }

  public generate(input: RuntimePlanGenerationInput): RuntimePlanGenerationResult {
    const stack = input.stack ?? [];
    const mode = this.resolveMode(input);
    const candidateFiles = this.buildCandidateFiles(input);
    const scope = this.buildScope({
      instruction: input.instruction,
      stack,
      candidateFiles,
      appliedDecisionContext: input.appliedDecisionContext,
      mode,
    });

    const risks = this.riskAnalyzer.analyze({
      instruction: input.instruction,
      scope,
      stack,
      readOnly: mode === 'read_only',
    });

    const riskLevel = this.riskAnalyzer.highestRisk(risks);
    const needsSnapshot = mode === 'patch' && (riskLevel === 'medium' || riskLevel === 'high');
    const requiresApproval = mode === 'patch' && (needsSnapshot || risks.length > 0);
    const verifyCommands = mode === 'read_only' ? [] : this.buildVerifyCommands(stack);
    const steps =
      mode === 'read_only'
        ? this.buildReadOnlySteps()
        : this.buildPatchSteps({
            needsSnapshot,
            requiresApproval,
            verifyCommands,
          });

    const plan: RuntimePlan = {
      id: this.createPlanId(),
      sessionId: input.sessionId,
      projectRoot: input.projectRoot,
      projectName: input.projectName,
      objective: input.instruction.trim(),
      mode,
      scope,
      steps,
      risks,
      verifyCommands,
      needsSnapshot,
      requiresApproval,
      riskLevel,
      status: 'generated',
      createdAt: new Date().toISOString(),
    };

    const validation = this.validator.validate(plan);

    return {
      plan: {
        ...plan,
        status: validation.valid ? 'validated' : 'rejected',
      },
      validation,
    };
  }

  private resolveMode(input: RuntimePlanGenerationInput): RuntimePlanMode {
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

  private buildScope(input: {
    instruction: string;
    stack: string[];
    candidateFiles: RuntimePlanCandidateFile[];
    appliedDecisionContext?: AppliedDecisionContext | undefined;
    mode: RuntimePlanMode;
  }): RuntimePlanScope {
    const includedAreas = this.inferIncludedAreas(input.instruction, input.stack);
    const excludedAreas = [
      '.env and secret files',
      'node_modules',
      '.git internals',
      'build outputs',
      'generated output folders',
      'dependency folders',
      'cache folders',
      'direct database migrations without explicit approval',
      ...(input.mode === 'read_only'
        ? [
            'patch proposal generation',
            'file apply operations',
            'snapshot creation for write flow',
            'patch verification commands',
          ]
        : []),
      ...this.renderAppliedBlockedAreas(input.appliedDecisionContext),
    ];

    return {
      summary:
        input.mode === 'read_only'
          ? `Read-only plan generated from user instruction with ${input.candidateFiles.length} context file(s).`
          : `Patch-oriented plan generated from user instruction with ${input.candidateFiles.length} candidate file(s).`,
      includedAreas,
      excludedAreas: [...new Set(excludedAreas)],
      candidateFiles: input.candidateFiles,
    };
  }

  private buildCandidateFiles(input: RuntimePlanGenerationInput): RuntimePlanCandidateFile[] {
    const knownFiles = input.knownFiles ?? [];
    const uniqueFiles = [
      ...new Set(
        knownFiles
          .map((file) => file.trim().replaceAll('\\', '/'))
          .filter((file) => file.length > 0)
          .filter((file) => this.isAllowedCandidatePath(file, input.appliedDecisionContext)),
      ),
    ];

    if (uniqueFiles.length > 0) {
      return uniqueFiles.map((file) => ({
        path: file,
        reason: 'Provided by runtime context as a known relevant file.',
        existsKnown: true,
      }));
    }

    return this.inferCandidateFiles(input.instruction)
      .filter((file) => this.isAllowedCandidatePath(file, input.appliedDecisionContext))
      .map((file) => ({
        path: file,
        reason: 'Inferred from the user instruction.',
        existsKnown: false,
      }));
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

  private inferCandidateFiles(instruction: string): string[] {
    const normalizedInstruction = instruction.toLowerCase();
    const files: string[] = [];

    if (normalizedInstruction.includes('route') || normalizedInstruction.includes('api')) {
      files.push('src/routes');
      files.push('src/controllers');
    }

    if (
      normalizedInstruction.includes('frontend') ||
      normalizedInstruction.includes('react') ||
      normalizedInstruction.includes('component')
    ) {
      files.push('src/components');
      files.push('src/api');
    }

    if (
      normalizedInstruction.includes('prisma') ||
      normalizedInstruction.includes('database') ||
      normalizedInstruction.includes('schema')
    ) {
      files.push('prisma/schema.prisma');
    }

    if (normalizedInstruction.includes('package') || normalizedInstruction.includes('script')) {
      files.push('package.json');
    }

    if (files.length === 0) {
      files.push('src');
    }

    return files;
  }

  private inferIncludedAreas(instruction: string, stack: string[]): string[] {
    const normalizedInstruction = instruction.toLowerCase();
    const areas = new Set<string>();

    if (stack.length > 0) {
      areas.add(`Detected stack: ${stack.join(', ')}`);
    }

    if (normalizedInstruction.includes('frontend') || normalizedInstruction.includes('react')) {
      areas.add('frontend');
    }

    if (
      normalizedInstruction.includes('backend') ||
      normalizedInstruction.includes('api') ||
      normalizedInstruction.includes('route')
    ) {
      areas.add('backend');
    }

    if (
      normalizedInstruction.includes('database') ||
      normalizedInstruction.includes('prisma') ||
      normalizedInstruction.includes('postgres')
    ) {
      areas.add('database');
    }

    if (areas.size === 0) {
      areas.add('project structure');
    }

    return [...areas];
  }

  private buildVerifyCommands(stack: string[]): RuntimePlanVerifyCommand[] {
    const normalizedStack = stack.map((item) => item.toLowerCase());
    const commands: RuntimePlanVerifyCommand[] = [
      {
        command: 'npm',
        args: ['run', 'typecheck'],
        reason: 'Validate TypeScript correctness before any patch is applied.',
        requiresApproval: true,
      },
    ];

    if (normalizedStack.includes('typescript')) {
      commands.push({
        command: 'tsc',
        args: ['--noEmit'],
        reason: 'Run TypeScript compiler without emitting files.',
        requiresApproval: true,
      });
    }

    if (
      normalizedStack.includes('react') ||
      normalizedStack.includes('vite') ||
      normalizedStack.includes('nextjs')
    ) {
      commands.push({
        command: 'npm',
        args: ['run', 'build'],
        reason: 'Validate frontend build after approved changes.',
        requiresApproval: true,
      });
    }

    return commands;
  }

  private buildReadOnlySteps(): RuntimePlanStep[] {
    return [
      {
        id: 'step-001',
        kind: 'inspect',
        title: 'Inspect source structure',
        description:
          'Inspect source files, project configuration and relevant context without generating patches.',
        requiresApproval: false,
      },
      {
        id: 'step-002',
        kind: 'context',
        title: 'Analyze project boundaries',
        description:
          'Review frontend, backend, API routes, config files and package scripts in read-only mode.',
        requiresApproval: false,
      },
      {
        id: 'step-003',
        kind: 'plan',
        title: 'Produce recommendations',
        description:
          'Produce findings, risks and recommendations only. Do not create patch proposals or apply files.',
        requiresApproval: false,
      },
      {
        id: 'step-004',
        kind: 'report',
        title: 'Export analysis report',
        description: 'Persist an auditable report with read-only findings and recommendations.',
        requiresApproval: false,
      },
    ];
  }

  private buildPatchSteps(input: {
    needsSnapshot: boolean;
    requiresApproval: boolean;
    verifyCommands: RuntimePlanVerifyCommand[];
  }): RuntimePlanStep[] {
    const steps: RuntimePlanStep[] = [
      {
        id: 'step-001',
        kind: 'inspect',
        title: 'Inspect relevant project context',
        description:
          'Read only the candidate files and related runtime context before proposing changes.',
        requiresApproval: false,
      },
      {
        id: 'step-002',
        kind: 'context',
        title: 'Confirm scope and boundaries',
        description:
          'Confirm included areas, excluded areas, protected paths and user constraints.',
        requiresApproval: false,
      },
    ];

    if (input.needsSnapshot) {
      steps.push({
        id: 'step-003',
        kind: 'snapshot',
        title: 'Create local snapshot before changes',
        description:
          'Create a local snapshot for candidate files before any patch is generated or applied.',
        requiresApproval: true,
      });
    }

    steps.push({
      id: input.needsSnapshot ? 'step-004' : 'step-003',
      kind: 'patch',
      title: 'Generate patch proposal',
      description:
        'Generate a patch proposal only after runtime validation confirms the plan is safe.',
      requiresApproval: true,
    });

    steps.push({
      id: input.needsSnapshot ? 'step-005' : 'step-004',
      kind: 'approval',
      title: 'Request user approval',
      description: 'Require explicit user approval before any patch can be applied.',
      requiresApproval: true,
    });

    if (input.verifyCommands.length > 0) {
      steps.push({
        id: input.needsSnapshot ? 'step-006' : 'step-005',
        kind: 'verify',
        title: 'Run safe verification',
        description: 'Run only allowed verification commands after approval.',
        requiresApproval: true,
      });
    }

    steps.push({
      id: input.needsSnapshot ? 'step-007' : 'step-006',
      kind: 'report',
      title: 'Export session report',
      description: 'Persist an audit report with plan, risks, approvals and verification results.',
      requiresApproval: false,
    });

    return steps;
  }

  private containsAny(value: string, terms: string[]): boolean {
    return terms.some((term) => value.includes(term));
  }

  private createPlanId(): string {
    return `runtime-plan-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}`;
  }
}
