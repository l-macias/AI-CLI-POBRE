import { normalize, relative, resolve } from 'node:path';
import type {
  RealProjectTrialInput,
  RealProjectTrialSafetyIssue,
} from '../types/RealProjectTrialTypes.js';

const sensitiveFileNames = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
]);

export interface RealProjectTrialSafetyPolicyEvaluateOptions {
  allowControlledValidation?: boolean | undefined;
}

export class RealProjectTrialSafetyPolicy {
  public evaluate(
    input: RealProjectTrialInput,
    options: RealProjectTrialSafetyPolicyEvaluateOptions = {},
  ): RealProjectTrialSafetyIssue[] {
    const issues: RealProjectTrialSafetyIssue[] = [];
    const projectRoot = resolve(input.targetProjectRoot);

    if (!input.projectName.trim()) {
      issues.push({
        code: 'PROJECT_NAME_REQUIRED',
        message: 'Project name is required.',
        severity: 'error',
      });
    }

    if (!input.objective.trim()) {
      issues.push({
        code: 'OBJECTIVE_REQUIRED',
        message: 'Trial objective is required.',
        severity: 'error',
      });
    }

    if (input.allowCommandExecution && options.allowControlledValidation !== true) {
      issues.push({
        code: 'COMMAND_EXECUTION_DISABLED_IN_PHASE_A',
        message: 'Command execution is disabled in Real Project Trial Phase A.',
        severity: 'error',
      });
    }

    if (input.allowCommandExecution && options.allowControlledValidation === true) {
      issues.push({
        code: 'CONTROLLED_VALIDATION_ENABLED',
        message: 'Command execution is enabled only for controlled validation scripts.',
        severity: 'info',
      });
    }

    if (input.allowWrites) {
      issues.push({
        code: 'WRITES_DISABLED_IN_CURRENT_PHASE',
        message: 'File writes are disabled in the current Real Project Trial phase.',
        severity: 'warning',
      });
    }

    for (const targetFile of input.targetFiles) {
      const normalizedTarget = normalize(targetFile);
      const baseName = normalizedTarget.split(/[\\/]/).at(-1) ?? normalizedTarget;

      if (sensitiveFileNames.has(baseName)) {
        issues.push({
          code: 'SENSITIVE_TARGET_FILE_BLOCKED',
          message: `Sensitive file cannot be targeted: ${targetFile}`,
          severity: 'error',
        });
      }

      const absoluteTarget = resolve(projectRoot, targetFile);
      const pathFromRoot = relative(projectRoot, absoluteTarget);

      if (pathFromRoot.startsWith('..') || pathFromRoot === '..') {
        issues.push({
          code: 'TARGET_FILE_ESCAPES_PROJECT_ROOT',
          message: `Target file escapes project root: ${targetFile}`,
          severity: 'error',
        });
      }
    }

    return issues;
  }

  public isSensitiveRelativePath(relativePath: string): boolean {
    const normalized = normalize(relativePath);
    const baseName = normalized.split(/[\\/]/).at(-1) ?? normalized;

    return sensitiveFileNames.has(baseName);
  }
}
