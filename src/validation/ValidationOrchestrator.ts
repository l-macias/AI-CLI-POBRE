import type {
  RuntimeValidator,
  ValidationResult,
  ValidationRun,
  ValidationStatus,
} from '../types/ValidationTypes.js';
import { BuildValidator } from './BuildValidator.js';
import { LintValidator } from './LintValidator.js';
import { TypeScriptValidator } from './TypeScriptValidator.js';
import { ValidationReporter } from './ValidationReporter.js';

export interface ValidationOrchestratorOptions {
  validators?: RuntimeValidator[] | undefined;
}

export class ValidationOrchestrator {
  private readonly validators: RuntimeValidator[];
  private readonly reporter = new ValidationReporter();

  public constructor(options: ValidationOrchestratorOptions = {}) {
    this.validators = options.validators ?? [
      new TypeScriptValidator(),
      new LintValidator(),
      new BuildValidator(),
    ];
  }

  public async runAll(): Promise<ValidationRun> {
    const startedAt = new Date();
    const results: ValidationResult[] = [];

    for (const validator of this.validators) {
      results.push(await validator.validate());
    }

    const finishedAt = new Date();
    const status = this.resolveStatus(results.map((result) => result.status));

    return {
      id: this.createRunId(),
      status,
      results,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    };
  }

  public createMarkdownReport(run: ValidationRun): string {
    return this.reporter.toMarkdown(run);
  }

  private resolveStatus(statuses: ValidationStatus[]): ValidationStatus {
    return this.reporter.resolveRunStatus(statuses);
  }

  private createRunId(): string {
    return `validation-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}`;
  }
}
