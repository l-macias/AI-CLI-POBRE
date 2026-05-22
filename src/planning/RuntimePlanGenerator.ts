import type {
  RuntimePlan,
  RuntimePlanCandidateFile,
  RuntimePlanGenerationInput,
  RuntimePlanGenerationResult,
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

  public constructor(options: RuntimePlanGeneratorOptions = {}) {
    this.riskAnalyzer = options.riskAnalyzer ?? new PlanRiskAnalyzer();
    this.validator = options.validator ?? new PlanPolicyValidator();
  }

  public generate(input: RuntimePlanGenerationInput): RuntimePlanGenerationResult {
    const stack = input.stack ?? [];
    const candidateFiles = this.buildCandidateFiles(input);
    const scope = this.buildScope({
      instruction: input.instruction,
      stack,
      candidateFiles,
    });

    const risks = this.riskAnalyzer.analyze({
      instruction: input.instruction,
      scope,
      stack,
    });

    const riskLevel = this.riskAnalyzer.highestRisk(risks);
    const needsSnapshot = riskLevel === 'medium' || riskLevel === 'high';
    const requiresApproval = needsSnapshot || risks.length > 0;
    const verifyCommands = this.buildVerifyCommands(stack);
    const steps = this.buildSteps({
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

  private buildScope(input: {
    instruction: string;
    stack: string[];
    candidateFiles: RuntimePlanCandidateFile[];
  }): RuntimePlanScope {
    const includedAreas = this.inferIncludedAreas(input.instruction, input.stack);
    const excludedAreas = [
      '.env and secret files',
      'node_modules',
      '.git internals',
      'build outputs',
      'direct database migrations without explicit approval',
    ];

    return {
      summary: `Plan generated from user instruction with ${input.candidateFiles.length} candidate file(s).`,
      includedAreas,
      excludedAreas,
      candidateFiles: input.candidateFiles,
    };
  }

  private buildCandidateFiles(input: RuntimePlanGenerationInput): RuntimePlanCandidateFile[] {
    const knownFiles = input.knownFiles ?? [];
    const uniqueFiles = [...new Set(knownFiles.map((file) => file.trim()).filter(Boolean))];

    if (uniqueFiles.length > 0) {
      return uniqueFiles.map((file) => ({
        path: file,
        reason: 'Provided by runtime context as a known relevant file.',
        existsKnown: true,
      }));
    }

    return this.inferCandidateFiles(input.instruction).map((file) => ({
      path: file,
      reason: 'Inferred from the user instruction.',
      existsKnown: false,
    }));
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

    if (
      normalizedStack.includes('react') ||
      normalizedStack.includes('vite') ||
      normalizedStack.includes('next') ||
      normalizedStack.includes('typescript')
    ) {
      commands.push({
        command: 'npm',
        args: ['run', 'build'],
        reason: 'Validate project build after generated changes are reviewed.',
        requiresApproval: true,
      });
    }

    return commands;
  }

  private buildSteps(input: {
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

  private createPlanId(): string {
    return `runtime-plan-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}`;
  }
}
