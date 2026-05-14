import type {
  RuntimeValidator,
  ValidationResult,
  ValidationTarget,
} from '../types/ValidationTypes.js';

export class TypeScriptValidator implements RuntimeValidator {
  public readonly target: ValidationTarget = {
    kind: 'typescript',
    label: 'TypeScript typecheck',
    command: 'npm run typecheck',
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
            'TypeScript validation is registered but not executed yet. Command execution is intentionally deferred.',
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
