import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { extname, resolve } from 'node:path';
import type {
  RealProjectTrialConfigInfo,
  RealProjectTrialInspection,
  RealProjectTrialInput,
  RealProjectTrialPackageInfo,
  RealProjectTrialStack,
  RealProjectTrialTargetFileInfo,
} from '../types/RealProjectTrialTypes.js';
import { RealProjectTrialSafetyPolicy } from './RealProjectTrialSafetyPolicy.js';

interface PackageJsonShape {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface RealProjectTrialTargetInspectorOptions {
  safetyPolicy?: RealProjectTrialSafetyPolicy | undefined;
}

export class RealProjectTrialTargetInspector {
  private readonly safetyPolicy: RealProjectTrialSafetyPolicy;

  public constructor(options: RealProjectTrialTargetInspectorOptions = {}) {
    this.safetyPolicy = options.safetyPolicy ?? new RealProjectTrialSafetyPolicy();
  }

  public async inspect(input: RealProjectTrialInput): Promise<RealProjectTrialInspection> {
    const projectRoot = resolve(input.targetProjectRoot);
    const packageInfo = await this.readPackageInfo(projectRoot);
    const configInfo = await this.readConfigInfo(projectRoot, packageInfo);
    const targetFiles = await this.inspectTargetFiles(projectRoot, input.targetFiles);

    return {
      projectRoot,
      packageInfo,
      configInfo,
      targetFiles,
      ignoredSensitiveFiles: ['.env', '.env.local', '.env.production', '.env.development'],
      inspectedAt: new Date().toISOString(),
      metadata: {
        readOnly: true,
        commandExecution: false,
      },
    };
  }

  private async readPackageInfo(projectRoot: string): Promise<RealProjectTrialPackageInfo> {
    const packagePath = resolve(projectRoot, 'package.json');

    if (!(await this.exists(packagePath))) {
      return {
        name: null,
        scripts: {},
        dependencies: {},
        devDependencies: {},
      };
    }

    const raw = await readFile(packagePath, 'utf8');
    const parsed = JSON.parse(raw) as PackageJsonShape;

    return {
      name: parsed.name ?? null,
      scripts: parsed.scripts ?? {},
      dependencies: parsed.dependencies ?? {},
      devDependencies: parsed.devDependencies ?? {},
    };
  }

  private async readConfigInfo(
    projectRoot: string,
    packageInfo: RealProjectTrialPackageInfo,
  ): Promise<RealProjectTrialConfigInfo> {
    const hasPackageJson = await this.exists(resolve(projectRoot, 'package.json'));
    const hasTsconfig = await this.exists(resolve(projectRoot, 'tsconfig.json'));
    const hasEslintConfig =
      (await this.exists(resolve(projectRoot, 'eslint.config.js'))) ||
      (await this.exists(resolve(projectRoot, 'eslint.config.mjs'))) ||
      (await this.exists(resolve(projectRoot, '.eslintrc'))) ||
      (await this.exists(resolve(projectRoot, '.eslintrc.json')));

    const hasNextConfig =
      (await this.exists(resolve(projectRoot, 'next.config.js'))) ||
      (await this.exists(resolve(projectRoot, 'next.config.mjs'))) ||
      (await this.exists(resolve(projectRoot, 'next.config.ts')));

    const hasPrismaSchema = await this.exists(resolve(projectRoot, 'prisma/schema.prisma'));

    return {
      hasPackageJson,
      hasTsconfig,
      hasEslintConfig,
      hasNextConfig,
      hasPrismaSchema,
      detectedStack: this.detectStack(packageInfo, {
        hasTsconfig,
        hasNextConfig,
      }),
    };
  }

  private async inspectTargetFiles(
    projectRoot: string,
    targetFiles: readonly string[],
  ): Promise<RealProjectTrialTargetFileInfo[]> {
    const results: RealProjectTrialTargetFileInfo[] = [];

    for (const relativePath of targetFiles) {
      if (this.safetyPolicy.isSensitiveRelativePath(relativePath)) {
        results.push({
          relativePath,
          exists: false,
        });
        continue;
      }

      const absolutePath = resolve(projectRoot, relativePath);

      if (!(await this.exists(absolutePath))) {
        results.push({
          relativePath,
          exists: false,
          extension: extname(relativePath),
        });
        continue;
      }

      const fileStat = await stat(absolutePath);

      results.push({
        relativePath,
        exists: fileStat.isFile(),
        bytes: fileStat.size,
        extension: extname(relativePath),
      });
    }

    return results;
  }

  private detectStack(
    packageInfo: RealProjectTrialPackageInfo,
    config: {
      hasTsconfig: boolean;
      hasNextConfig: boolean;
    },
  ): RealProjectTrialStack[] {
    const stacks = new Set<RealProjectTrialStack>();

    if (
      packageInfo.dependencies['next'] ||
      packageInfo.devDependencies['next'] ||
      config.hasNextConfig
    ) {
      stacks.add('next');
    }

    if (packageInfo.dependencies['react'] || packageInfo.devDependencies['react']) {
      stacks.add('react');
    }

    if (config.hasTsconfig || packageInfo.devDependencies['typescript']) {
      stacks.add('typescript');
    }

    if (packageInfo.name || Object.keys(packageInfo.scripts).length > 0) {
      stacks.add('node');
    }

    if (stacks.size === 0) {
      stacks.add('unknown');
    }

    return [...stacks];
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
