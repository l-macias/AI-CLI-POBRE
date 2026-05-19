import { resolve } from 'node:path';
import type {
  RealProjectTrialInput,
  RealProjectTrialReport,
  RealProjectTrialStatus,
} from '../types/RealProjectTrialTypes.js';
import { RealProjectTrialReporter } from './RealProjectTrialReporter.js';
import { RealProjectTrialSafetyPolicy } from './RealProjectTrialSafetyPolicy.js';
import { RealProjectTrialTargetInspector } from './RealProjectTrialTargetInspector.js';
import { RealProjectTrialValidator } from './RealProjectTrialValidator.js';

export interface RealProjectTrialRunnerOptions {
  safetyPolicy?: RealProjectTrialSafetyPolicy | undefined;
  inspector?: RealProjectTrialTargetInspector | undefined;
  reporter?: RealProjectTrialReporter | undefined;
  validator?: RealProjectTrialValidator | undefined;
}

export class RealProjectTrialRunner {
  private readonly safetyPolicy: RealProjectTrialSafetyPolicy;
  private readonly inspector: RealProjectTrialTargetInspector;
  private readonly reporter: RealProjectTrialReporter;
  private readonly validator: RealProjectTrialValidator;

  public constructor(options: RealProjectTrialRunnerOptions = {}) {
    this.safetyPolicy = options.safetyPolicy ?? new RealProjectTrialSafetyPolicy();
    this.inspector =
      options.inspector ??
      new RealProjectTrialTargetInspector({
        safetyPolicy: this.safetyPolicy,
      });
    this.reporter = options.reporter ?? new RealProjectTrialReporter();
    this.validator = options.validator ?? new RealProjectTrialValidator();
  }

  public async run(input: RealProjectTrialInput): Promise<RealProjectTrialReport> {
    return this.runInternal({
      input,
      runControlledValidation: false,
    });
  }

  public async validate(input: RealProjectTrialInput): Promise<RealProjectTrialReport> {
    return this.runInternal({
      input: {
        ...input,
        allowCommandExecution: true,
        allowWrites: false,
      },
      runControlledValidation: true,
    });
  }

  private async runInternal(input: {
    input: RealProjectTrialInput;
    runControlledValidation: boolean;
  }): Promise<RealProjectTrialReport> {
    const createdAt = new Date().toISOString();
    const issues = this.safetyPolicy.evaluate(input.input, {
      allowControlledValidation: input.runControlledValidation,
    });
    const hasBlockingIssue = issues.some((issue) => issue.severity === 'error');

    if (hasBlockingIssue) {
      const report: RealProjectTrialReport = {
        id: this.createTrialId(input.input.projectName, createdAt),
        status: 'blocked',
        projectName: input.input.projectName,
        objective: input.input.objective,
        allowWrites: input.input.allowWrites,
        allowCommandExecution: input.input.allowCommandExecution,
        createdAt,
        updatedAt: createdAt,
        issues,
        nextRecommendedActions: [
          'Fix blocking safety issues.',
          'Run Real Project Trial again before attempting validation or edits.',
        ],
      };

      await this.reporter.write(report);

      return report;
    }

    try {
      const inspection = await this.inspector.inspect({
        ...input.input,
        targetProjectRoot: resolve(input.input.targetProjectRoot),
        allowWrites: false,
        allowCommandExecution: false,
      });

      const validation = input.runControlledValidation
        ? await this.validator.validate(inspection)
        : undefined;

      const status: RealProjectTrialStatus = 'inspected';
      const updatedAt = new Date().toISOString();

      const report: RealProjectTrialReport = {
        id: this.createTrialId(input.input.projectName, createdAt),
        status,
        projectName: input.input.projectName,
        objective: input.input.objective,
        allowWrites: input.input.allowWrites,
        allowCommandExecution: input.input.allowCommandExecution,
        createdAt,
        updatedAt,
        inspection,
        validation,
        issues,
        nextRecommendedActions: validation
          ? [
              'Review captured validation findings.',
              'Map findings to target files.',
              'Generate diff preview before any edit.',
              'Require explicit confirmation before writing changes.',
            ]
          : [
              'Run controlled validation in Phase B using sandboxed npm scripts.',
              'Capture TypeScript/ESLint/build output.',
              'Map failures to target files.',
              'Generate diff preview before any edit.',
              'Require explicit confirmation before writing changes.',
            ],
      };

      await this.reporter.write(report);

      return report;
    } catch (error) {
      const updatedAt = new Date().toISOString();

      const report: RealProjectTrialReport = {
        id: this.createTrialId(input.input.projectName, createdAt),
        status: 'failed',
        projectName: input.input.projectName,
        objective: input.input.objective,
        allowWrites: input.input.allowWrites,
        allowCommandExecution: input.input.allowCommandExecution,
        createdAt,
        updatedAt,
        issues: [
          ...issues,
          {
            code: 'REAL_PROJECT_TRIAL_FAILED',
            message: error instanceof Error ? error.message : String(error),
            severity: 'error',
          },
        ],
        nextRecommendedActions: [
          'Verify targetProjectRoot.',
          'Verify required files exist.',
          'Run Real Project Trial again.',
        ],
      };

      await this.reporter.write(report);

      return report;
    }
  }

  private createTrialId(projectName: string, timestamp: string): string {
    const safeProjectName = projectName.replaceAll(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();

    return `real-project-trial-${safeProjectName}-${timestamp
      .replaceAll(':', '')
      .replaceAll('.', '')}`;
  }
}
