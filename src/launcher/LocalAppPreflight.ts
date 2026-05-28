import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PortAvailabilityChecker } from './PortAvailabilityChecker.js';
import type {
  LocalAppPreflightCheck,
  LocalAppPreflightIssue,
  LocalAppPreflightResult,
} from './LocalAppLauncherTypes.js';

export interface LocalAppPreflightInput {
  host: string;
  apiPort: number;
  uiHost: string;
  uiPort: number;
  uiDir: string;
}

export interface LocalAppPreflightDependencies {
  portChecker?: PortAvailabilityChecker | undefined;
}

export class LocalAppPreflight {
  private readonly portChecker: PortAvailabilityChecker;

  public constructor(dependencies: LocalAppPreflightDependencies = {}) {
    this.portChecker = dependencies.portChecker ?? new PortAvailabilityChecker();
  }

  public async check(input: LocalAppPreflightInput): Promise<LocalAppPreflightResult> {
    const checks: LocalAppPreflightCheck[] = [];
    const issues: LocalAppPreflightIssue[] = [];

    this.checkUiDirectory(input.uiDir, checks, issues);
    this.checkUiPackageJson(input.uiDir, checks, issues);
    this.checkUiNodeModules(input.uiDir, checks, issues);

    const npmAvailable = await this.checkNpm(checks, issues);

    if (npmAvailable) {
      await this.checkPorts(input, checks, issues);
    }

    return {
      status: issues.some((issue) => issue.severity === 'error') ? 'failed' : 'passed',
      checks,
      issues,
    };
  }

  private checkUiDirectory(
    uiDir: string,
    checks: LocalAppPreflightCheck[],
    issues: LocalAppPreflightIssue[],
  ): void {
    if (!existsSync(uiDir)) {
      checks.push({
        name: 'ui-directory',
        status: 'failed',
        message: `UI directory not found: ${uiDir}`,
      });

      issues.push({
        code: 'ui_dir_missing',
        severity: 'error',
        message: `UI directory not found: ${uiDir}`,
        action: 'Create the UI directory or pass --ui-dir with the correct path.',
      });

      return;
    }

    const stats = statSync(uiDir);

    if (!stats.isDirectory()) {
      checks.push({
        name: 'ui-directory',
        status: 'failed',
        message: `UI path exists but is not a directory: ${uiDir}`,
      });

      issues.push({
        code: 'ui_dir_missing',
        severity: 'error',
        message: `UI path exists but is not a directory: ${uiDir}`,
        action: 'Pass --ui-dir pointing to the actual UI folder.',
      });

      return;
    }

    checks.push({
      name: 'ui-directory',
      status: 'passed',
      message: `UI directory found: ${uiDir}`,
    });
  }

  private checkUiPackageJson(
    uiDir: string,
    checks: LocalAppPreflightCheck[],
    issues: LocalAppPreflightIssue[],
  ): void {
    const packageJsonPath = join(uiDir, 'package.json');

    if (!existsSync(packageJsonPath)) {
      checks.push({
        name: 'ui-package-json',
        status: 'failed',
        message: `UI package.json not found: ${packageJsonPath}`,
      });

      issues.push({
        code: 'ui_package_missing',
        severity: 'error',
        message: `UI package.json not found: ${packageJsonPath}`,
        action:
          'Run this command from the project root or pass --ui-dir with the correct UI folder.',
      });

      return;
    }

    checks.push({
      name: 'ui-package-json',
      status: 'passed',
      message: `UI package.json found: ${packageJsonPath}`,
    });
  }

  private checkUiNodeModules(
    uiDir: string,
    checks: LocalAppPreflightCheck[],
    issues: LocalAppPreflightIssue[],
  ): void {
    const nodeModulesPath = join(uiDir, 'node_modules');

    if (!existsSync(nodeModulesPath)) {
      checks.push({
        name: 'ui-node-modules',
        status: 'failed',
        message: `UI node_modules not found: ${nodeModulesPath}`,
      });

      issues.push({
        code: 'ui_node_modules_missing',
        severity: 'error',
        message: `UI node_modules not found: ${nodeModulesPath}`,
        action: 'Run npm install inside the UI directory before launching Zero Runtime.',
      });

      return;
    }

    checks.push({
      name: 'ui-node-modules',
      status: 'passed',
      message: `UI node_modules found: ${nodeModulesPath}`,
    });
  }

  private async checkNpm(
    checks: LocalAppPreflightCheck[],
    issues: LocalAppPreflightIssue[],
  ): Promise<boolean> {
    const result = await this.canRunNpm();

    if (!result.available) {
      checks.push({
        name: 'npm',
        status: 'failed',
        message: result.message,
      });

      issues.push({
        code: 'npm_missing',
        severity: 'error',
        message: result.message,
        action: 'Install Node.js/npm and verify npm is available in PATH.',
      });

      return false;
    }

    checks.push({
      name: 'npm',
      status: 'passed',
      message: result.message,
    });

    return true;
  }

  private async checkPorts(
    input: LocalAppPreflightInput,
    checks: LocalAppPreflightCheck[],
    issues: LocalAppPreflightIssue[],
  ): Promise<void> {
    const apiPort = await this.portChecker.check({
      host: input.host,
      port: input.apiPort,
    });

    if (!apiPort.available) {
      checks.push({
        name: 'api-port',
        status: 'failed',
        message: apiPort.message,
      });

      issues.push({
        code: 'api_port_busy',
        severity: 'error',
        message: apiPort.message,
        action: `Stop the process using port ${input.apiPort} or pass --api-port with a free port.`,
      });
    } else {
      checks.push({
        name: 'api-port',
        status: 'passed',
        message: apiPort.message,
      });
    }

    const uiPort = await this.portChecker.check({
      host: input.uiHost,
      port: input.uiPort,
    });

    if (!uiPort.available) {
      checks.push({
        name: 'ui-port',
        status: 'failed',
        message: uiPort.message,
      });

      issues.push({
        code: 'ui_port_busy',
        severity: 'error',
        message: uiPort.message,
        action: `Stop the process using port ${input.uiPort} or pass --ui-port with a free port.`,
      });
    } else {
      checks.push({
        name: 'ui-port',
        status: 'passed',
        message: uiPort.message,
      });
    }
  }

  private async canRunNpm(): Promise<{
    available: boolean;
    message: string;
  }> {
    return new Promise((resolveCheck) => {
      const child = spawn('npm', ['--version'], {
        shell: process.platform === 'win32',
        windowsHide: true,
        stdio: 'ignore',
      });

      child.once('error', (error: Error) => {
        resolveCheck({
          available: false,
          message: `npm is not available: ${error.message}`,
        });
      });

      child.once('exit', (code) => {
        if (code === 0) {
          resolveCheck({
            available: true,
            message: 'npm is available.',
          });
          return;
        }

        resolveCheck({
          available: false,
          message: `npm --version exited with code ${String(code)}.`,
        });
      });
    });
  }
}
