import { GeneratedPathPolicy } from '../projects/GeneratedPathPolicy.js';
import type {
  RuntimePlan,
  RuntimePlanValidationIssue,
  RuntimePlanValidationResult,
} from './RuntimePlan.js';

export class PlanPolicyValidator {
  private readonly generatedPathPolicy = new GeneratedPathPolicy();

  public validate(plan: RuntimePlan): RuntimePlanValidationResult {
    const issues: RuntimePlanValidationIssue[] = [];

    this.validateObjective(plan, issues);
    this.validateScope(plan, issues);
    this.validateSteps(plan, issues);
    this.validateVerifyCommands(plan, issues);
    this.validateReadOnlyAuthority(plan, issues);
    this.validateRuntimeAuthority(plan, issues);

    return {
      valid: issues.every((issue) => issue.severity !== 'error'),
      issues,
    };
  }

  private validateObjective(plan: RuntimePlan, issues: RuntimePlanValidationIssue[]): void {
    if (plan.objective.trim().length < 5) {
      issues.push({
        code: 'PLAN_OBJECTIVE_TOO_SHORT',
        message: 'Runtime plan objective is too short.',
        severity: 'error',
      });
    }
  }

  private validateScope(plan: RuntimePlan, issues: RuntimePlanValidationIssue[]): void {
    for (const candidate of plan.scope.candidateFiles) {
      const normalizedPath = this.normalizePath(candidate.path);

      if (this.isAbsolutePath(normalizedPath)) {
        issues.push({
          code: 'ABSOLUTE_PATH_NOT_ALLOWED',
          message: 'Runtime plans must use project-relative candidate file paths.',
          path: candidate.path,
          severity: 'error',
        });
      }

      if (this.generatedPathPolicy.isGeneratedPath(normalizedPath)) {
        issues.push({
          code: 'GENERATED_PATH_NOT_ALLOWED',
          message: 'Runtime plan candidate files cannot include generated/dependency/cache paths.',
          path: candidate.path,
          severity: 'error',
        });
      }

      if (this.hasProtectedSegment(normalizedPath)) {
        issues.push({
          code: 'PROTECTED_PATH_NOT_ALLOWED',
          message: 'Runtime plan candidate files cannot include protected paths.',
          path: candidate.path,
          severity: 'error',
        });
      }
    }
  }

  private validateSteps(plan: RuntimePlan, issues: RuntimePlanValidationIssue[]): void {
    if (plan.steps.length === 0) {
      issues.push({
        code: 'PLAN_STEPS_REQUIRED',
        message: 'Runtime plan must include at least one step.',
        severity: 'error',
      });
    }

    const stepIds = new Set<string>();

    for (const step of plan.steps) {
      if (stepIds.has(step.id)) {
        issues.push({
          code: 'DUPLICATED_STEP_ID',
          message: `Duplicated runtime plan step id: ${step.id}`,
          severity: 'error',
        });
      }

      stepIds.add(step.id);

      if (
        (step.kind === 'patch' || step.kind === 'approval' || step.kind === 'snapshot') &&
        !step.requiresApproval
      ) {
        issues.push({
          code: 'CONTROLLED_STEP_REQUIRES_APPROVAL',
          message: `Step "${step.id}" must require approval.`,
          severity: 'error',
        });
      }
    }
  }

  private validateVerifyCommands(plan: RuntimePlan, issues: RuntimePlanValidationIssue[]): void {
    for (const verifyCommand of plan.verifyCommands) {
      if (!verifyCommand.requiresApproval) {
        issues.push({
          code: 'VERIFY_COMMAND_REQUIRES_APPROVAL',
          message: 'Verify commands must always require approval.',
          severity: 'error',
        });
      }

      const commandLine = [verifyCommand.command, ...verifyCommand.args].join(' ');

      if (!this.isAllowedVerifyCommand(commandLine)) {
        issues.push({
          code: 'VERIFY_COMMAND_NOT_ALLOWED',
          message: `Verify command is not allowed: ${commandLine}`,
          severity: 'error',
        });
      }
    }
  }

  private validateReadOnlyAuthority(plan: RuntimePlan, issues: RuntimePlanValidationIssue[]): void {
    if (plan.mode !== 'read_only') {
      return;
    }

    const forbiddenStepKinds = plan.steps.filter((step) => {
      return step.kind === 'patch' || step.kind === 'approval' || step.kind === 'snapshot';
    });

    for (const step of forbiddenStepKinds) {
      issues.push({
        code: 'READ_ONLY_PLAN_HAS_WRITE_STEP',
        message: `Read-only plans cannot include "${step.kind}" steps.`,
        severity: 'error',
      });
    }

    if (plan.needsSnapshot) {
      issues.push({
        code: 'READ_ONLY_PLAN_CANNOT_REQUIRE_SNAPSHOT',
        message: 'Read-only plans cannot require snapshots.',
        severity: 'error',
      });
    }

    if (plan.requiresApproval) {
      issues.push({
        code: 'READ_ONLY_PLAN_CANNOT_REQUIRE_WRITE_APPROVAL',
        message: 'Read-only plans cannot require patch approval.',
        severity: 'error',
      });
    }

    if (plan.verifyCommands.length > 0) {
      issues.push({
        code: 'READ_ONLY_PLAN_CANNOT_REQUIRE_VERIFY_COMMANDS',
        message: 'Read-only plans cannot require verification commands for patch/apply flow.',
        severity: 'error',
      });
    }
  }

  private validateRuntimeAuthority(plan: RuntimePlan, issues: RuntimePlanValidationIssue[]): void {
    if (plan.mode === 'read_only') {
      return;
    }

    if (plan.riskLevel === 'high' && !plan.needsSnapshot) {
      issues.push({
        code: 'HIGH_RISK_REQUIRES_SNAPSHOT',
        message: 'High-risk plans must require a snapshot.',
        severity: 'error',
      });
    }

    if ((plan.riskLevel === 'medium' || plan.riskLevel === 'high') && !plan.requiresApproval) {
      issues.push({
        code: 'RISKY_PLAN_REQUIRES_APPROVAL',
        message: 'Medium and high-risk plans must require approval.',
        severity: 'error',
      });
    }
  }

  private normalizePath(pathValue: string): string {
    return pathValue
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '');
  }

  private isAbsolutePath(pathValue: string): boolean {
    return /^[a-z]:\//i.test(pathValue) || pathValue.startsWith('/');
  }

  private hasProtectedSegment(pathValue: string): boolean {
    const loweredPath = pathValue.toLowerCase();
    const segments = loweredPath.split('/');

    return (
      loweredPath.startsWith('.env') ||
      loweredPath.includes('/.env') ||
      segments.includes('.git') ||
      segments.includes('node_modules')
    );
  }

  private isAllowedVerifyCommand(commandLine: string): boolean {
    return (
      commandLine === 'npm run build' ||
      commandLine === 'npm run lint' ||
      commandLine === 'npm run typecheck' ||
      commandLine === 'tsc --noEmit'
    );
  }
}
