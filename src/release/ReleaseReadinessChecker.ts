import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { safeJsonParse } from '../utils/safeJson.js';

export type ReleaseReadinessCheckStatus = 'passed' | 'warning' | 'failed';

export interface ReleaseReadinessCheck {
  name: string;
  status: ReleaseReadinessCheckStatus;
  message: string;
}

export interface ReleaseReadinessSummary {
  passed: number;
  warnings: number;
  failed: number;
  total: number;
}

export interface ReleaseReadinessReport {
  status: 'passed' | 'warning' | 'failed';
  projectRoot: string;
  checkedAt: string;
  summary: ReleaseReadinessSummary;
  checks: ReleaseReadinessCheck[];
}

interface PackageJsonLike {
  name?: string | undefined;
  version?: string | undefined;
  description?: string | undefined;
  type?: string | undefined;
  private?: boolean | undefined;
  license?: string | undefined;
  scripts?: Record<string, string> | undefined;
  dependencies?: Record<string, string> | undefined;
  devDependencies?: Record<string, string> | undefined;
}

export class ReleaseReadinessChecker {
  public async check(projectRoot: string): Promise<ReleaseReadinessReport> {
    const root = resolve(projectRoot);
    const packageJson = await this.readPackageJson(root);
    const scripts = packageJson.scripts ?? {};
    const gitignore = await this.readOptionalFile(root, '.gitignore');

    const checks: ReleaseReadinessCheck[] = [
      await this.requiredFile(root, 'package.json'),
      await this.requiredFile(root, '.env.example'),
      await this.requiredFile(root, '.gitignore'),

      this.packageFieldCheck('package:name', packageJson.name, 'package.json must define name.'),
      this.packageFieldCheck(
        'package:version',
        packageJson.version,
        'package.json must define version.',
      ),
      this.packageFieldCheck('package:type', packageJson.type, 'package.json must define type.'),
      this.packageFieldCheck(
        'package:description',
        packageJson.description,
        'package.json must define description.',
      ),
      this.packagePrivateCheck(packageJson),
      this.packageLicenseCheck(packageJson),
      this.packageDescriptionIncludesCheck(packageJson, 'runtime-centered'),

      this.gitignoreContainsCheck(gitignore, '.env'),
      this.gitignoreContainsCheck(gitignore, '.env.local'),
      this.gitignoreContainsCheck(gitignore, '.runtime/'),

      this.scriptExistsCheck(scripts, 'check'),
      this.scriptExistsCheck(scripts, 'typecheck'),
      this.scriptExistsCheck(scripts, 'lint'),
      this.scriptExistsCheck(scripts, 'mvp:test'),
      this.scriptExistsCheck(scripts, 'rc:test'),
      this.scriptExistsCheck(scripts, 'release:readiness:test'),
      this.scriptExistsCheck(scripts, 'real-provider:test'),
      this.scriptExistsCheck(scripts, 'mvp:smoke:test'),
      this.scriptExistsCheck(scripts, 'product-flow:test'),
      this.scriptExistsCheck(scripts, 'cli:all:test'),
      this.scriptExistsCheck(scripts, 'cli:quickstart:test'),
      this.scriptExistsCheck(scripts, 'security:all:test'),
      this.scriptExistsCheck(scripts, 'agent:all:test'),
      this.scriptExistsCheck(scripts, 'memory:all:test'),
      this.scriptExistsCheck(scripts, 'provider:all:test'),
      this.scriptExistsCheck(scripts, 'repair:all:test'),
      this.scriptExistsCheck(scripts, 'patch:all:test'),
      this.scriptExistsCheck(scripts, 'scaffold:all:test'),

      this.scriptIncludesCheck(scripts, 'rc:test', 'npm run mvp:test'),
      this.scriptIncludesCheck(scripts, 'rc:test', 'npm run release:readiness:test'),
      this.scriptIncludesCheck(scripts, 'mvp:test', 'npm run check'),
      this.scriptIncludesCheck(scripts, 'mvp:test', 'npm run product-flow:test'),
      this.scriptIncludesCheck(scripts, 'mvp:test', 'npm run cli:all:test'),
      this.scriptIncludesCheck(scripts, 'mvp:test', 'npm run security:all:test'),
      this.scriptIncludesCheck(scripts, 'mvp:test', 'npm run memory:all:test'),
      this.scriptIncludesCheck(scripts, 'mvp:test', 'npm run provider:all:test'),
      this.scriptIncludesCheck(scripts, 'cli:all:test', 'npm run cli:quickstart:test'),

      this.scriptExcludesCheck(scripts, 'mvp:test', 'real-provider:test'),
      this.scriptExcludesCheck(scripts, 'mvp:test', 'repair:openrouter-smoke:test'),
      this.scriptExcludesCheck(scripts, 'mvp:test', 'agent:real-provider-smoke:test'),
      this.scriptExcludesCheck(scripts, 'rc:test', 'real-provider:test'),
      this.scriptExcludesCheck(scripts, 'rc:test', 'repair:openrouter-smoke:test'),
      this.scriptExcludesCheck(scripts, 'rc:test', 'agent:real-provider-smoke:test'),
      this.scriptExcludesCheck(scripts, 'release:readiness:test', 'real-provider:test'),
      this.scriptExcludesCheck(scripts, 'mvp:smoke:test', 'real-provider:test'),

      this.scriptIncludesCheck(scripts, 'real-provider:test', 'provider:openrouter-client:test'),
      this.scriptIncludesCheck(scripts, 'real-provider:test', 'repair:openrouter-smoke:test'),
      this.scriptIncludesCheck(scripts, 'real-provider:test', 'agent:real-provider-smoke:test'),

      await this.requiredFile(root, 'src/examples/end-to-end-product-flow-test.ts'),
      await this.requiredFile(root, 'src/examples/cli-quickstart-test.ts'),
      await this.requiredFile(root, 'src/examples/release-readiness-check-test.ts'),
      await this.requiredFile(root, 'src/examples/mvp-smoke-test.ts'),
      await this.requiredFile(root, 'src/demo/DemoScenarioRunner.ts'),
      await this.requiredFile(root, 'src/demo/DemoScenarioReporter.ts'),
      await this.requiredFile(root, 'src/release/ReleaseReadinessChecker.ts'),

      this.packageDependencyCheck(packageJson, 'zod'),
      this.packageDependencyCheck(packageJson, 'tsx'),
      this.packageDependencyCheck(packageJson, 'typescript'),
      this.packageDependencyCheck(packageJson, 'eslint'),
    ];

    const summary = this.summarize(checks);

    return {
      status: this.resolveStatus(summary),
      projectRoot: root,
      checkedAt: new Date().toISOString(),
      summary,
      checks,
    };
  }

  private async readPackageJson(projectRoot: string): Promise<PackageJsonLike> {
    const content = await readFile(resolve(projectRoot, 'package.json'), 'utf8');
    const parsed = safeJsonParse(content);

    if (!parsed.ok) {
      throw new Error(`package.json parse failed: ${parsed.error.message}`);
    }

    if (!this.isRecord(parsed.value)) {
      throw new Error('package.json must be an object.');
    }

    const scripts = this.readStringRecord(parsed.value['scripts']);
    const dependencies = this.readStringRecord(parsed.value['dependencies']);
    const devDependencies = this.readStringRecord(parsed.value['devDependencies']);

    const result: PackageJsonLike = {
      name: this.readString(parsed.value['name']),
      version: this.readString(parsed.value['version']),
      description: this.readString(parsed.value['description']),
      type: this.readString(parsed.value['type']),
      private: typeof parsed.value['private'] === 'boolean' ? parsed.value['private'] : undefined,
      license: this.readString(parsed.value['license']),
    };

    if (scripts) {
      result.scripts = scripts;
    }

    if (dependencies) {
      result.dependencies = dependencies;
    }

    if (devDependencies) {
      result.devDependencies = devDependencies;
    }

    return result;
  }

  private async readOptionalFile(
    projectRoot: string,
    relativePath: string,
  ): Promise<string | null> {
    try {
      return await readFile(resolve(projectRoot, relativePath), 'utf8');
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  private async requiredFile(
    projectRoot: string,
    relativePath: string,
  ): Promise<ReleaseReadinessCheck> {
    const exists = await this.exists(resolve(projectRoot, relativePath));

    return {
      name: `file:${relativePath}`,
      status: exists ? 'passed' : 'failed',
      message: exists
        ? `Required file exists: ${relativePath}`
        : `Required file is missing: ${relativePath}`,
    };
  }

  private packageFieldCheck(
    name: string,
    value: string | undefined,
    failedMessage: string,
  ): ReleaseReadinessCheck {
    return {
      name,
      status: value && value.trim().length > 0 ? 'passed' : 'failed',
      message: value && value.trim().length > 0 ? `${name} is present.` : failedMessage,
    };
  }

  private packagePrivateCheck(packageJson: PackageJsonLike): ReleaseReadinessCheck {
    return {
      name: 'package:private',
      status: packageJson.private === true ? 'passed' : 'warning',
      message:
        packageJson.private === true
          ? 'Package is private for MVP safety.'
          : 'Package is not private. Publishing should be intentional.',
    };
  }

  private packageLicenseCheck(packageJson: PackageJsonLike): ReleaseReadinessCheck {
    return {
      name: 'package:license',
      status: packageJson.license && packageJson.license.trim().length > 0 ? 'passed' : 'warning',
      message:
        packageJson.license && packageJson.license.trim().length > 0
          ? 'Package license is present.'
          : 'Package license is missing.',
    };
  }

  private packageDescriptionIncludesCheck(
    packageJson: PackageJsonLike,
    expected: string,
  ): ReleaseReadinessCheck {
    const description = packageJson.description ?? '';

    return {
      name: `package:description:includes:${expected}`,
      status: description.toLowerCase().includes(expected.toLowerCase()) ? 'passed' : 'failed',
      message: description.toLowerCase().includes(expected.toLowerCase())
        ? `Package description includes "${expected}".`
        : `Package description must include "${expected}".`,
    };
  }

  private gitignoreContainsCheck(
    gitignore: string | null,
    expected: string,
  ): ReleaseReadinessCheck {
    const contains = gitignore?.split(/\r?\n/u).some((line) => line.trim() === expected) ?? false;

    return {
      name: `gitignore:contains:${expected}`,
      status: contains ? 'passed' : 'failed',
      message: contains
        ? `.gitignore contains ${expected}.`
        : `.gitignore must contain ${expected}.`,
    };
  }

  private scriptExistsCheck(
    scripts: Record<string, string>,
    scriptName: string,
  ): ReleaseReadinessCheck {
    const exists = typeof scripts[scriptName] === 'string' && scripts[scriptName].trim().length > 0;

    return {
      name: `script:${scriptName}`,
      status: exists ? 'passed' : 'failed',
      message: exists ? `Script exists: ${scriptName}` : `Missing script: ${scriptName}`,
    };
  }

  private scriptIncludesCheck(
    scripts: Record<string, string>,
    scriptName: string,
    expected: string,
  ): ReleaseReadinessCheck {
    const script = scripts[scriptName] ?? '';
    const includes = script.includes(expected);

    return {
      name: `script-includes:${scriptName}:${expected}`,
      status: includes ? 'passed' : 'failed',
      message: includes
        ? `${scriptName} includes "${expected}".`
        : `${scriptName} must include "${expected}".`,
    };
  }

  private scriptExcludesCheck(
    scripts: Record<string, string>,
    scriptName: string,
    forbidden: string,
  ): ReleaseReadinessCheck {
    const script = scripts[scriptName] ?? '';
    const excludes = !script.includes(forbidden);

    return {
      name: `script-excludes:${scriptName}:${forbidden}`,
      status: excludes ? 'passed' : 'failed',
      message: excludes
        ? `${scriptName} does not include forbidden "${forbidden}".`
        : `${scriptName} must not include "${forbidden}".`,
    };
  }

  private packageDependencyCheck(
    packageJson: PackageJsonLike,
    dependencyName: string,
  ): ReleaseReadinessCheck {
    const exists =
      packageJson.dependencies?.[dependencyName] !== undefined ||
      packageJson.devDependencies?.[dependencyName] !== undefined;

    return {
      name: `dependency:${dependencyName}`,
      status: exists ? 'passed' : 'failed',
      message: exists
        ? `Dependency is declared: ${dependencyName}`
        : `Missing dependency: ${dependencyName}`,
    };
  }

  private summarize(checks: readonly ReleaseReadinessCheck[]): ReleaseReadinessSummary {
    return {
      passed: checks.filter((check) => check.status === 'passed').length,
      warnings: checks.filter((check) => check.status === 'warning').length,
      failed: checks.filter((check) => check.status === 'failed').length,
      total: checks.length,
    };
  }

  private resolveStatus(summary: ReleaseReadinessSummary): ReleaseReadinessReport['status'] {
    if (summary.failed > 0) {
      return 'failed';
    }

    if (summary.warnings > 0) {
      return 'warning';
    }

    return 'passed';
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private readStringRecord(value: unknown): Record<string, string> | undefined {
    if (!this.isRecord(value)) {
      return undefined;
    }

    const output: Record<string, string> = {};

    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'string') {
        output[key] = item;
      }
    }

    return output;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
