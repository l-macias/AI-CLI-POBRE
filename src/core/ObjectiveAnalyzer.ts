import type {
  ObjectiveValidationResult,
  RuntimeObjective,
  RuntimeObjectiveInput,
} from '../types/ObjectiveTypes.js';

export class ObjectiveAnalyzer {
  public analyze(input: RuntimeObjectiveInput): RuntimeObjective {
    const normalizedObjective = this.normalize(input.objective);
    const normalizedModule = this.normalize(input.module);

    const validation = this.validate({
      objective: normalizedObjective,
      module: normalizedModule,
    });

    if (!validation.valid) {
      throw new Error(`Invalid objective input: ${validation.issues.join(', ')}`);
    }

    return {
      id: this.createObjectiveId(),
      objective: input.objective.trim(),
      module: input.module.trim(),
      normalizedObjective,
      createdAt: new Date().toISOString(),
    };
  }

  private validate(input: { objective: string; module: string }): ObjectiveValidationResult {
    const issues: string[] = [];

    if (input.objective.length < 5) {
      issues.push('Objective must contain at least 5 characters.');
    }

    if (input.module.length < 2) {
      issues.push('Module must contain at least 2 characters.');
    }

    if (input.objective.length > 1000) {
      issues.push('Objective is too long.');
    }

    if (input.module.length > 120) {
      issues.push('Module name is too long.');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private normalize(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private createObjectiveId(): string {
    return `objective-${new Date()
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replaceAll('.', '')}`;
  }
}
