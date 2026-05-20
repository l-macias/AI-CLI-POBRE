import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export type ReleaseReadinessStatus = 'passed' | 'failed';

export interface ReleaseReadinessCheck {
  readonly name: string;
  readonly status: ReleaseReadinessStatus;
  readonly message: string;
}

export interface ReleaseReadinessReport {
  readonly status: ReleaseReadinessStatus;
  readonly projectRoot: string;
  readonly packageJsonPath: string;
  readonly checks: readonly ReleaseReadinessCheck[];
  readonly summary: {
    readonly passed: number;
    readonly failed: number;
    readonly total: number;
  };
}

interface PackageJsonLike {
  readonly name?: string | undefined;
  readonly version?: string | undefined;
  readonly description?: string | undefined;
  readonly type?: string | undefined;
  readonly private?: boolean | undefined;
  readonly license?: string | undefined;
  readonly scripts?: Record<string, string> | undefined;
}

export class ReleaseReadinessChecker {
  public async check(projectRootInput: string): Promise<ReleaseReadinessReport> {
    const projectRoot = resolve(projectRootInput);
    const packageJsonPath = resolve(projectRoot, 'package.json');
    const packageJson = await this.readPackageJson(packageJsonPath);
    const scripts = packageJson.scripts ?? {};

    const checks: ReleaseReadinessCheck[] = [
      await this.fileExistsCheck(projectRoot, 'package.json', 'package.json exists.'),
      await this.fileExistsCheck(projectRoot, '.env.example', '.env.example exists.'),
      await this.fileExistsCheck(projectRoot, 'README.md', 'README.md exists.'),
      await this.directoryExistsCheck(projectRoot, 'docs', 'docs directory exists.'),

      this.packageStringEqualsCheck(packageJson, 'name', 'zero-runtime'),
      this.packageStringEqualsCheck(packageJson, 'version', '0.1.0'),
      this.packageStringEqualsCheck(packageJson, 'type', 'module'),
      this.packageStringEqualsCheck(packageJson, 'license', 'MIT'),
      this.packageBooleanEqualsCheck(packageJson, 'private', true),
      this.packageStringIncludesCheck(packageJson, 'description', 'runtime-centered'),

      await this.fileExistsCheck(projectRoot, 'docs/index.md', 'docs/index.md exists.'),
      await this.fileExistsCheck(projectRoot, 'docs/quickstart.md', 'docs/quickstart.md exists.'),
      await this.fileExistsCheck(projectRoot, 'docs/cli-agent.md', 'docs/cli-agent.md exists.'),
      await this.fileExistsCheck(projectRoot, 'docs/scaffold.md', 'docs/scaffold.md exists.'),
      await this.fileExistsCheck(
        projectRoot,
        'docs/provider-openrouter.md',
        'docs/provider-openrouter.md exists.',
      ),
      await this.fileExistsCheck(
        projectRoot,
        'docs/security-model.md',
        'docs/security-model.md exists.',
      ),
      await this.fileExistsCheck(
        projectRoot,
        'docs/release-checklist.md',
        'docs/release-checklist.md exists.',
      ),

      await this.fileContainsCheck(
        projectRoot,
        'README.md',
        'runtime-centered',
        'README describes runtime-centered architecture.',
      ),
      await this.fileContainsCheck(
        projectRoot,
        'README.md',
        'quickstart',
        'README documents quickstart.',
      ),
      await this.fileContainsCheck(
        projectRoot,
        'README.md',
        'real-provider:test',
        'README documents separated real provider tests.',
      ),
      await this.fileContainsCheck(
        projectRoot,
        'docs/index.md',
        'Zero Runtime Documentation',
        'docs/index.md has docs title.',
      ),
      await this.fileContainsCheck(
        projectRoot,
        'docs/security-model.md',
        'Provider output is untrusted',
        'security model documents untrusted provider output.',
      ),
      await this.fileContainsCheck(
        projectRoot,
        'docs/security-model.md',
        'Patch application requires explicit approval',
        'security model documents patch approval.',
      ),
      await this.fileContainsCheck(
        projectRoot,
        'docs/security-model.md',
        '.env',
        'security model documents .env handling.',
      ),
      await this.fileContainsCheck(
        projectRoot,
        'docs/release-checklist.md',
        'Release blockers',
        'release checklist documents blockers.',
      ),

      this.scriptExistsCheck(scripts, 'check'),
      this.scriptExistsCheck(scripts, 'mvp:test'),
      this.scriptExistsCheck(scripts, 'rc:test'),
      this.scriptExistsCheck(scripts, 'release:readiness:test'),
      this.scriptExistsCheck(scripts, 'real-provider:test'),
      this.scriptExistsCheck(scripts, 'product-flow:test'),
      this.scriptExistsCheck(scripts, 'cli:quickstart:test'),
      this.scriptExistsCheck(scripts, 'cli:all:test'),

      this.scriptIncludesCheck(scripts, 'rc:test', 'npm run mvp:test'),
      this.scriptIncludesCheck(scripts, 'rc:test', 'npm run release:readiness:test'),
      this.scriptIncludesCheck(scripts, 'mvp:test', 'npm run product-flow:test'),
      this.scriptIncludesCheck(scripts, 'mvp:test', 'npm run cli:all:test'),
      this.scriptIncludesCheck(scripts, 'cli:all:test', 'npm run cli:quickstart:test'),

      this.scriptExcludesCheck(scripts, 'mvp:test', 'real-provider:test'),
      this.scriptExcludesCheck(scripts, 'mvp:test', 'repair:openrouter-smoke:test'),
      this.scriptExcludesCheck(scripts, 'mvp:test', 'agent:real-provider-smoke:test'),
      this.scriptExcludesCheck(scripts, 'rc:test', 'real-provider:test'),
      this.scriptExcludesCheck(scripts, 'rc:test', 'repair:openrouter-smoke:test'),
      this.scriptExcludesCheck(scripts, 'rc:test', 'agent:real-provider-smoke:test'),

      this.scriptIncludesCheck(scripts, 'real-provider:test', 'provider:openrouter-client:test'),
      this.scriptIncludesCheck(scripts, 'real-provider:test', 'repair:openrouter-smoke:test'),
      this.scriptIncludesCheck(scripts, 'real-provider:test', 'agent:real-provider-smoke:test'),

      await this.fileExistsCheck(
        projectRoot,
        'src/examples/end-to-end-product-flow-test.ts',
        'Product flow test exists.',
      ),
      await this.fileExistsCheck(
        projectRoot,
        'src/examples/cli-quickstart-test.ts',
        'CLI quickstart test exists.',
      ),
      await this.fileExistsCheck(
        projectRoot,
        'src/demo/DemoScenarioRunner.ts',
        'Demo scenario runner exists.',
      ),
      await this.fileExistsCheck(
        projectRoot,
        'src/demo/DemoScenarioReporter.ts',
        'Demo scenario reporter exists.',
      ),
    ];

    const summary = {
      passed: checks.filter((check) => check.status === 'passed').length,
      failed: checks.filter((check) => check.status === 'failed').length,
      total: checks.length,
    };

    return {
      status: summary.failed === 0 ? 'passed' : 'failed',
      projectRoot,
      packageJsonPath,
      checks,
      summary,
    };
  }

  private async readPackageJson(path: string): Promise<PackageJsonLike> {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as unknown;

    if (!this.isRecord(parsed)) {
      throw new Error('package.json must be a JSON object.');
    }

    const scripts = parsed['scripts'];

    if (scripts !== undefined && !this.isStringRecord(scripts)) {
      throw new Error('package.json scripts must be a string record.');
    }

    return {
      name: this.readOptionalString(parsed, 'name'),
      version: this.readOptionalString(parsed, 'version'),
      description: this.readOptionalString(parsed, 'description'),
      type: this.readOptionalString(parsed, 'type'),
      private: this.readOptionalBoolean(parsed, 'private'),
      license: this.readOptionalString(parsed, 'license'),
      scripts,
    };
  }

  private packageStringEqualsCheck(
    packageJson: PackageJsonLike,
    fieldName: 'name' | 'version' | 'type' | 'license',
    expectedValue: string,
  ): ReleaseReadinessCheck {
    const actual = packageJson[fieldName];
    const passed = actual === expectedValue;

    return {
      name: `package:${fieldName}`,
      status: passed ? 'passed' : 'failed',
      message: passed
        ? `package.json ${fieldName} is "${expectedValue}".`
        : `package.json ${fieldName} must be "${expectedValue}".`,
    };
  }

  private packageStringIncludesCheck(
    packageJson: PackageJsonLike,
    fieldName: 'description',
    expectedFragment: string,
  ): ReleaseReadinessCheck {
    const actual = packageJson[fieldName] ?? '';
    const passed = actual.includes(expectedFragment);

    return {
      name: `package:${fieldName}:includes:${expectedFragment}`,
      status: passed ? 'passed' : 'failed',
      message: passed
        ? `package.json ${fieldName} includes "${expectedFragment}".`
        : `package.json ${fieldName} must include "${expectedFragment}".`,
    };
  }

  private packageBooleanEqualsCheck(
    packageJson: PackageJsonLike,
    fieldName: 'private',
    expectedValue: boolean,
  ): ReleaseReadinessCheck {
    const actual = packageJson[fieldName];
    const passed = actual === expectedValue;

    return {
      name: `package:${fieldName}`,
      status: passed ? 'passed' : 'failed',
      message: passed
        ? `package.json ${fieldName} is ${String(expectedValue)}.`
        : `package.json ${fieldName} must be ${String(expectedValue)}.`,
    };
  }

  private async fileExistsCheck(
    projectRoot: string,
    relativePath: string,
    passedMessage: string,
  ): Promise<ReleaseReadinessCheck> {
    const exists = await this.exists(resolve(projectRoot, relativePath));

    return {
      name: `file:${relativePath}`,
      status: exists ? 'passed' : 'failed',
      message: exists ? passedMessage : `${relativePath} is missing.`,
    };
  }

  private async directoryExistsCheck(
    projectRoot: string,
    relativePath: string,
    passedMessage: string,
  ): Promise<ReleaseReadinessCheck> {
    const exists = await this.exists(resolve(projectRoot, relativePath));

    return {
      name: `directory:${relativePath}`,
      status: exists ? 'passed' : 'failed',
      message: exists ? passedMessage : `${relativePath} directory is missing.`,
    };
  }

  private async fileContainsCheck(
    projectRoot: string,
    relativePath: string,
    expectedContent: string,
    passedMessage: string,
  ): Promise<ReleaseReadinessCheck> {
    const path = resolve(projectRoot, relativePath);

    try {
      const content = await readFile(path, 'utf8');
      const passed = content.includes(expectedContent);

      return {
        name: `file-contains:${relativePath}:${expectedContent}`,
        status: passed ? 'passed' : 'failed',
        message: passed ? passedMessage : `${relativePath} must include "${expectedContent}".`,
      };
    } catch {
      return {
        name: `file-contains:${relativePath}:${expectedContent}`,
        status: 'failed',
        message: `${relativePath} could not be read.`,
      };
    }
  }

  private scriptExistsCheck(
    scripts: Record<string, string>,
    scriptName: string,
  ): ReleaseReadinessCheck {
    const exists = typeof scripts[scriptName] === 'string' && scripts[scriptName].trim().length > 0;

    return {
      name: `script:${scriptName}`,
      status: exists ? 'passed' : 'failed',
      message: exists ? `${scriptName} script exists.` : `${scriptName} script is missing.`,
    };
  }

  private scriptIncludesCheck(
    scripts: Record<string, string>,
    scriptName: string,
    expectedFragment: string,
  ): ReleaseReadinessCheck {
    const actual = scripts[scriptName] ?? '';
    const passed = actual.includes(expectedFragment);

    return {
      name: `script-includes:${scriptName}:${expectedFragment}`,
      status: passed ? 'passed' : 'failed',
      message: passed
        ? `${scriptName} includes "${expectedFragment}".`
        : `${scriptName} must include "${expectedFragment}".`,
    };
  }

  private scriptExcludesCheck(
    scripts: Record<string, string>,
    scriptName: string,
    forbiddenFragment: string,
  ): ReleaseReadinessCheck {
    const actual = scripts[scriptName] ?? '';
    const passed = !actual.includes(forbiddenFragment);

    return {
      name: `script-excludes:${scriptName}:${forbiddenFragment}`,
      status: passed ? 'passed' : 'failed',
      message: passed
        ? `${scriptName} does not include "${forbiddenFragment}".`
        : `${scriptName} must not include "${forbiddenFragment}".`,
    };
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];

    return typeof value === 'string' ? value : undefined;
  }

  private readOptionalBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
    const value = record[key];

    return typeof value === 'boolean' ? value : undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isStringRecord(value: unknown): value is Record<string, string> {
    if (!this.isRecord(value)) {
      return false;
    }

    return Object.values(value).every((entry) => typeof entry === 'string');
  }
}
