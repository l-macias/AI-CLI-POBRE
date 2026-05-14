import type {
  RuntimeValidator,
  ValidationResult,
  ValidationTarget,
} from '../types/ValidationTypes.js';

export class BuildValidator implements RuntimeValidator {
  public readonly target: ValidationTarget = {
    kind: 'build',
    label: 'Project build',
    command: 'npm run build',
  };

  public validate(): ValidationResult {
    const startedAt = new Date();
    const finishedAt = new Date();

    return {
      target: this.target,
      status: 'skipped',
      issues: [
        {
          code: 'VALIDATION_COMMAND_NOT_EXECUTED',
          message:
            'Build validation is registered but not executed yet. Command execution is intentionally deferred.',
          severity: 'info',
          source: this.target.command,
        },
      ],
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    };
  }
}
