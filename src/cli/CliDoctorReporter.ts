import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  RuntimeBootstrapPlan,
  RuntimeBootstrapPlanIssue,
} from '../bootstrap/BootstrapTypes.js';
import type { WorkspaceConfig } from '../workspace/WorkspaceConfigTypes.js';

export type CliDoctorCheckStatus = 'passed' | 'warning' | 'failed';

export interface CliDoctorCheck {
  readonly name: string;
  readonly label: string;
  readonly status: CliDoctorCheckStatus;
  readonly required: boolean;
  readonly message: string;
}

export interface CliDoctorSummary {
  readonly passed: number;
  readonly warnings: number;
  readonly failed: number;
  readonly total: number;
}

export interface CliDoctorReport {
  readonly projectRoot: string;
  readonly ready: boolean;
  readonly summary: CliDoctorSummary;
  readonly stack: RuntimeBootstrapPlan['stack'];
  readonly runtime: RuntimeBootstrapPlan['inspection'];
  readonly checks: Record<string, CliDoctorCheckStatus>;
  readonly checkDetails: CliDoctorCheck[];
  readonly issues: RuntimeBootstrapPlanIssue[];
  readonly recommendations: string[];
}

export interface CliDoctorReporterInput {
  readonly projectRoot: string;
  readonly bootstrapPlan: RuntimeBootstrapPlan;
  readonly workspaceConfig?: WorkspaceConfig | undefined;
  readonly workspaceConfigError?: string | undefined;
}

export class CliDoctorReporter {
  public async build(input: CliDoctorReporterInput): Promise<CliDoctorReport> {
    const docsExist = await this.exists(join(input.projectRoot, 'docs'));
    const envExampleExists = await this.exists(join(input.projectRoot, '.env.example'));
    const packageJsonExists = input.bootstrapPlan.stack.hasPackageJson;
    const tsconfigExists = input.bootstrapPlan.stack.hasTsConfig;
    const srcDirectoryExists = input.bootstrapPlan.stack.hasSrcDirectory;
    const runtimeExists = input.bootstrapPlan.inspection.runtimeExists;
    const runtimeFilesComplete = input.bootstrapPlan.inspection.missingFiles.length === 0;

    const checkDetails: CliDoctorCheck[] = [
      this.check({
        name: 'runtimeDirectory',
        label: 'Runtime directory',
        passed: runtimeExists,
        passedMessage: '.runtime directory exists.',
        failedMessage: '.runtime directory is missing.',
        required: true,
      }),
      this.check({
        name: 'runtimeFiles',
        label: 'Runtime files',
        passed: runtimeFilesComplete,
        passedMessage: 'Required runtime files are present.',
        failedMessage: `Missing runtime files: ${this.joinOrNone(
          input.bootstrapPlan.inspection.missingFiles,
        )}`,
        required: false,
        failedStatus: 'warning',
      }),
      this.check({
        name: 'packageJson',
        label: 'package.json',
        passed: packageJsonExists,
        passedMessage: 'package.json exists.',
        failedMessage: 'package.json is missing.',
        required: false,
        failedStatus: 'warning',
      }),
      this.check({
        name: 'tsconfig',
        label: 'TypeScript config',
        passed: tsconfigExists,
        passedMessage: 'tsconfig.json exists.',
        failedMessage: 'tsconfig.json is missing.',
        required: false,
        failedStatus: 'warning',
      }),
      this.check({
        name: 'srcDirectory',
        label: 'Source directory',
        passed: srcDirectoryExists,
        passedMessage: 'src directory exists.',
        failedMessage: 'src directory is missing.',
        required: false,
        failedStatus: 'warning',
      }),
      this.check({
        name: 'workspaceConfig',
        label: 'Workspace config',
        passed: input.workspaceConfigError === undefined,
        passedMessage: 'Workspace config is valid or not required.',
        failedMessage: input.workspaceConfigError ?? 'Workspace config is invalid.',
        required: true,
      }),
      this.check({
        name: 'workspaceCurrentProject',
        label: 'Workspace current project',
        passed:
          input.workspaceConfig?.currentProjectId !== undefined
            ? input.workspaceConfig.currentProjectId !== null
            : true,
        passedMessage: 'Workspace current project is configured or not required.',
        failedMessage: 'Workspace config exists but no current project is selected.',
        required: false,
        failedStatus: 'warning',
      }),
      this.check({
        name: 'docs',
        label: 'Documentation directory',
        passed: docsExist,
        passedMessage: 'docs directory exists.',
        failedMessage: 'docs directory is missing.',
        required: false,
        failedStatus: 'warning',
      }),
      this.check({
        name: 'envExample',
        label: 'Environment example',
        passed: envExampleExists,
        passedMessage: '.env.example exists.',
        failedMessage: '.env.example is missing.',
        required: false,
        failedStatus: 'warning',
      }),
    ];

    const issues = this.buildIssues(input);
    const summary = this.summarize(checkDetails);
    const checks = Object.fromEntries(
      checkDetails.map((check) => [check.name, check.status]),
    ) as Record<string, CliDoctorCheckStatus>;

    return {
      projectRoot: input.projectRoot,
      ready: summary.failed === 0,
      summary,
      stack: input.bootstrapPlan.stack,
      runtime: input.bootstrapPlan.inspection,
      checks,
      checkDetails,
      issues,
      recommendations: this.buildRecommendations(checkDetails, input.bootstrapPlan),
    };
  }

  private check(input: {
    name: string;
    label: string;
    passed: boolean;
    passedMessage: string;
    failedMessage: string;
    required: boolean;
    failedStatus?: CliDoctorCheckStatus | undefined;
  }): CliDoctorCheck {
    return {
      name: input.name,
      label: input.label,
      status: input.passed ? 'passed' : (input.failedStatus ?? 'failed'),
      required: input.required,
      message: input.passed ? input.passedMessage : input.failedMessage,
    };
  }

  private summarize(checks: readonly CliDoctorCheck[]): CliDoctorSummary {
    return {
      passed: checks.filter((check) => check.status === 'passed').length,
      warnings: checks.filter((check) => check.status === 'warning').length,
      failed: checks.filter((check) => check.status === 'failed').length,
      total: checks.length,
    };
  }

  private buildIssues(input: CliDoctorReporterInput): RuntimeBootstrapPlanIssue[] {
    const issues = [...input.bootstrapPlan.issues];

    if (input.workspaceConfigError) {
      issues.push({
        code: 'CLI_DOCTOR_WORKSPACE_CONFIG_INVALID',
        message: input.workspaceConfigError,
        severity: 'error',
      });
    }

    return issues;
  }

  private buildRecommendations(
    checks: readonly CliDoctorCheck[],
    plan: RuntimeBootstrapPlan,
  ): string[] {
    const recommendations: string[] = [];

    if (!plan.inspection.runtimeExists) {
      recommendations.push('Run: zero init --project ./target');
    }

    if (plan.inspection.missingFiles.length > 0) {
      recommendations.push('Review missing .runtime files before running agent workflows.');
    }

    if (!plan.stack.hasPackageJson) {
      recommendations.push(
        'Add package.json so Zero Runtime can detect scripts and project metadata.',
      );
    }

    if (!plan.stack.hasTsConfig) {
      recommendations.push('Add tsconfig.json for TypeScript validation workflows.');
    }

    if (!plan.stack.hasSrcDirectory) {
      recommendations.push('Add a src directory or point commands to explicit target files.');
    }

    for (const check of checks) {
      if (check.name === 'workspaceCurrentProject' && check.status === 'warning') {
        recommendations.push('Run: zero project use <project-name>');
      }

      if (check.name === 'envExample' && check.status === 'warning') {
        recommendations.push(
          'Add .env.example documenting safe provider/runtime environment variables.',
        );
      }

      if (check.name === 'docs' && check.status === 'warning') {
        recommendations.push('Add docs/ before release readiness.');
      }
    }

    return [...new Set(recommendations)];
  }

  private joinOrNone(values: readonly string[]): string {
    return values.length > 0 ? values.join(', ') : 'none';
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
