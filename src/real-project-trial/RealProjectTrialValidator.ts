import type {
  RealProjectTrialInspection,
  RealProjectTrialValidationSummary,
  RealProjectTrialValidationStatus,
} from '../types/RealProjectTrialTypes.js';
import { RealProjectTrialCommandRunner } from './RealProjectTrialCommandRunner.js';
import { RealProjectTrialErrorCollector } from './RealProjectTrialErrorCollector.js';
import { RealProjectTrialValidationPlanner } from './RealProjectTrialValidationPlanner.js';

export interface RealProjectTrialValidatorOptions {
  planner?: RealProjectTrialValidationPlanner | undefined;
  runner?: RealProjectTrialCommandRunner | undefined;
  errorCollector?: RealProjectTrialErrorCollector | undefined;
}

export class RealProjectTrialValidator {
  private readonly planner: RealProjectTrialValidationPlanner;
  private readonly runner: RealProjectTrialCommandRunner;
  private readonly errorCollector: RealProjectTrialErrorCollector;

  public constructor(options: RealProjectTrialValidatorOptions = {}) {
    this.planner = options.planner ?? new RealProjectTrialValidationPlanner();
    this.runner = options.runner ?? new RealProjectTrialCommandRunner();
    this.errorCollector = options.errorCollector ?? new RealProjectTrialErrorCollector();
  }

  public async validate(
    inspection: RealProjectTrialInspection,
  ): Promise<RealProjectTrialValidationSummary> {
    const commands = await this.planner.plan(inspection);
    const results = [];

    for (const command of commands) {
      results.push(
        await this.runner.run({
          projectRoot: inspection.projectRoot,
          command,
        }),
      );

      const lastResult = results.at(-1);

      if (lastResult && lastResult.status !== 'passed' && lastResult.status !== 'skipped') {
        break;
      }
    }

    const findings = this.errorCollector.collect(results);
    const status = this.resolveStatus(results.map((result) => result.status));

    return {
      status,
      commands: results,
      findings,
      validatedAt: new Date().toISOString(),
    };
  }

  private resolveStatus(
    statuses: RealProjectTrialValidationStatus[],
  ): RealProjectTrialValidationStatus {
    if (statuses.length === 0) {
      return 'skipped';
    }

    if (statuses.some((status) => status === 'failed')) {
      return 'failed';
    }

    if (statuses.some((status) => status === 'timeout')) {
      return 'timeout';
    }

    if (statuses.some((status) => status === 'blocked')) {
      return 'blocked';
    }

    if (statuses.every((status) => status === 'passed')) {
      return 'passed';
    }

    return 'skipped';
  }
}
