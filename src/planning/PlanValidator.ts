import type {
  PlanValidationIssue,
  PlanValidationResult,
  RuntimePlan,
  RuntimePlanStep,
} from '../types/PlanningTypes.js';
import { ArchitecturePathGuard } from './ArchitecturePathGuard.js';
const dangerousCommandPatterns = [
  /\brm\s+-rf\b/i,
  /\bdel\s+\/s\b/i,
  /\bformat\b/i,
  /\bdrop\s+database\b/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
  /\bmkfs\b/i,
  /\bchmod\s+777\b/i,
];

const protectedTargets = ['.env', '.git', 'node_modules', 'dist'];

export class PlanValidator {
  private readonly architecturePathGuard = new ArchitecturePathGuard();
  public validate(plan: RuntimePlan): PlanValidationResult {
    const issues: PlanValidationIssue[] = [];

    this.validatePlanShape(plan, issues);

    for (const step of plan.steps) {
      this.validateStep(step, issues);
      issues.push(...this.architecturePathGuard.validateStep(step));
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private validatePlanShape(plan: RuntimePlan, issues: PlanValidationIssue[]): void {
    if (plan.steps.length === 0) {
      issues.push({
        code: 'PLAN_EMPTY',
        message: 'Plan must contain at least one step.',
      });
    }

    if (plan.steps.length > 12) {
      issues.push({
        code: 'PLAN_TOO_LARGE',
        message: 'Plan cannot contain more than 12 steps.',
      });
    }

    const stepIds = new Set<string>();

    for (const step of plan.steps) {
      if (stepIds.has(step.id)) {
        issues.push({
          code: 'DUPLICATED_STEP_ID',
          message: `Duplicated step id "${step.id}".`,
          stepId: step.id,
        });
      }

      stepIds.add(step.id);
    }
  }

  private validateStep(step: RuntimePlanStep, issues: PlanValidationIssue[]): void {
    if (step.type === 'run_command' && !step.command) {
      issues.push({
        code: 'COMMAND_REQUIRED',
        message: 'run_command steps must include a command.',
        stepId: step.id,
      });
    }

    if (step.type !== 'run_command' && step.command) {
      issues.push({
        code: 'COMMAND_NOT_ALLOWED',
        message: `Step type "${step.type}" cannot include a command.`,
        stepId: step.id,
      });
    }

    if (step.command && this.isDangerousCommand(step.command)) {
      issues.push({
        code: 'DANGEROUS_COMMAND',
        message: `Dangerous command blocked: ${step.command}`,
        stepId: step.id,
      });
    }

    if (step.target && this.isProtectedTarget(step.target)) {
      issues.push({
        code: 'PROTECTED_TARGET',
        message: `Protected target blocked: ${step.target}`,
        stepId: step.id,
      });
    }

    if (step.type === 'run_command' && !step.requiresApproval) {
      issues.push({
        code: 'COMMAND_REQUIRES_APPROVAL',
        message: 'run_command steps must require approval.',
        stepId: step.id,
      });
    }

    if ((step.type === 'edit_file' || step.type === 'create_file') && !step.target) {
      issues.push({
        code: 'TARGET_REQUIRED',
        message: `${step.type} steps must include a target.`,
        stepId: step.id,
      });
    }
  }

  private isDangerousCommand(command: string): boolean {
    return dangerousCommandPatterns.some((pattern) => pattern.test(command));
  }

  private isProtectedTarget(target: string): boolean {
    const normalizedTarget = target.replaceAll('\\', '/').toLowerCase();

    return protectedTargets.some((protectedTarget) => {
      return (
        normalizedTarget === protectedTarget ||
        normalizedTarget.startsWith(`${protectedTarget}/`) ||
        normalizedTarget.includes(`/${protectedTarget}/`)
      );
    });
  }
}
