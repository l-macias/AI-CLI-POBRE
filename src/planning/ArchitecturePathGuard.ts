import type { PlanValidationIssue, RuntimePlanStep } from '../types/PlanningTypes.js';

const forbiddenPathPatterns = [/^src\/planning\/types\.ts$/i, /^src\/planning\/validator\.ts$/i];

const canonicalPathAliases: Record<string, string> = {
  'src/planning/types.ts': 'src/types/PlanningTypes.ts',
  'src/planning/validator.ts': 'src/planning/PlanValidator.ts',
};

const allowedSourceRoots = [
  'src/core/',
  'src/providers/',
  'src/planning/',
  'src/session/',
  'src/observability/',
  'src/types/',
  'src/utils/',
  'src/examples/',
  'src/execution/',
  'src/loop/',
];

const allowedRuntimeRoots = [
  '.runtime/loop-tests/',
  '.runtime/session-18-tests/',
  '.runtime/session-19-tests/',
  '.runtime/write-tests/',
];

const allowedRuntimeFiles = [
  '.runtime/current-state.md',
  '.runtime/active-module.md',
  '.runtime/decisions.md',
  '.runtime/next-steps.md',
  '.runtime/progress-log.md',
  '.runtime/handoff.md',
  '.runtime/active-plan.json',
  '.runtime/plan-history.md',
  '.runtime/execution-history.md',
  '.runtime/runtime-loop.md',
];

const protectedPathSegments = ['.env', '.git', 'node_modules', 'dist', 'build', '.next'];

export class ArchitecturePathGuard {
  public validateStep(step: RuntimePlanStep): PlanValidationIssue[] {
    if (!step.target) {
      return [];
    }

    const normalizedTarget = this.normalizePath(step.target);
    const issues: PlanValidationIssue[] = [];

    if (this.hasProtectedSegment(normalizedTarget)) {
      issues.push({
        code: 'ARCHITECTURE_PROTECTED_PATH',
        message: `Protected architecture path blocked: ${step.target}`,
        stepId: step.id,
      });

      return issues;
    }

    const canonicalReplacement = canonicalPathAliases[normalizedTarget.toLowerCase()];

    if (canonicalReplacement) {
      issues.push({
        code: 'NON_CANONICAL_ARCHITECTURE_PATH',
        message: `Non-canonical path "${step.target}" must be "${canonicalReplacement}".`,
        stepId: step.id,
      });
    }

    if (this.isForbiddenPath(normalizedTarget)) {
      issues.push({
        code: 'FORBIDDEN_ARCHITECTURE_PATH',
        message: `Forbidden architecture path proposed: ${step.target}`,
        stepId: step.id,
      });
    }

    if (!this.isAllowedProjectPath(normalizedTarget)) {
      issues.push({
        code: 'OUT_OF_ARCHITECTURE_PATH',
        message: `Target is outside the canonical project architecture: ${step.target}`,
        stepId: step.id,
      });
    }

    return issues;
  }

  private normalizePath(target: string): string {
    return target
      .trim()
      .replaceAll('\\', '/')
      .replace(/^\.\/+/, '');
  }

  private isForbiddenPath(target: string): boolean {
    return forbiddenPathPatterns.some((pattern) => pattern.test(target));
  }

  private isAllowedProjectPath(target: string): boolean {
    if (allowedRuntimeFiles.includes(target)) {
      return true;
    }

    if (allowedRuntimeRoots.some((root) => target.startsWith(root))) {
      return true;
    }

    return allowedSourceRoots.some((root) => target.startsWith(root));
  }

  private hasProtectedSegment(target: string): boolean {
    const loweredTarget = target.toLowerCase();
    const segments = loweredTarget.split('/');

    return protectedPathSegments.some((protectedSegment) => segments.includes(protectedSegment));
  }
}
