import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { CliRunner } from '../cli/CliRunner.js';
import { DemoProjectFactory } from './DemoProjectFactory.js';
import { DemoScenarioReporter } from './DemoScenarioReporter.js';

export interface DemoScenarioRunnerInput {
  readonly projectRoot: string;
  readonly reportPath?: string | undefined;
}

export interface DemoScenarioResult {
  readonly status: 'ok';
  readonly projectRoot: string;
  readonly proposalPath: string;
  readonly reportPath: string;
  readonly scaffoldStatus: string;
  readonly dryRunStatus: string;
  readonly applyStatus: string;
  readonly validationStatus: string;
  readonly gitWorkingTreeStatus: string;
  readonly changedFiles: readonly string[];
  readonly generatedFiles: readonly string[];
}

interface CliOutputRecord {
  readonly status?: string | undefined;
  readonly proposalOutputPath?: string | undefined;
  readonly validation?: {
    readonly status?: string | undefined;
  } | null;
  readonly operationResults?: readonly {
    readonly targetFile?: string | undefined;
    readonly status?: string | undefined;
  }[];
}

interface GitStatusCliOutputRecord {
  readonly status?: {
    readonly workingTreeState?: string | undefined;
    readonly clean?: boolean | undefined;
    readonly modifiedFiles?: readonly string[] | undefined;
    readonly untrackedFiles?: readonly string[] | undefined;
    readonly deletedFiles?: readonly string[] | undefined;
  };
  readonly text?: string | undefined;
}

interface GitSummary {
  readonly workingTreeStatus: string;
  readonly changedFiles: readonly string[];
}

export class DemoScenarioRunner {
  private readonly factory: DemoProjectFactory;
  private readonly cliRunner: CliRunner;
  private readonly reporter: DemoScenarioReporter;

  public constructor(
    input: {
      factory?: DemoProjectFactory;
      cliRunner?: CliRunner;
      reporter?: DemoScenarioReporter;
    } = {},
  ) {
    this.factory = input.factory ?? new DemoProjectFactory();
    this.cliRunner = input.cliRunner ?? new CliRunner();
    this.reporter = input.reporter ?? new DemoScenarioReporter();
  }

  public async run(input: DemoScenarioRunnerInput): Promise<DemoScenarioResult> {
    const fixture = await this.factory.create({
      projectRoot: input.projectRoot,
      projectName: 'zero-runtime-product-flow-demo',
    });

    const proposalRelativePath = '.runtime/proposals/auth-module.patch-proposal.json';
    const proposalPath = resolve(fixture.projectRoot, proposalRelativePath);
    const reportPath = resolve(
      input.reportPath ?? join(fixture.projectRoot, '.runtime/quickstart-report.md'),
    );

    const scaffoldResult = await this.cliRunner.run([
      'scaffold',
      'module',
      '--project',
      fixture.projectRoot,
      '--name',
      'auth',
      '--kind',
      'backend',
      '--target',
      'src/modules/auth',
      '--provider',
      'fake-llm',
      '--save-proposal',
      proposalRelativePath,
    ]);

    this.assertStatus(scaffoldResult.status, 'ok', 'scaffold module');
    const scaffoldOutput = this.requireOutputRecord(scaffoldResult.output, 'scaffold output');

    if (scaffoldOutput.status !== 'patch_ready') {
      throw new Error(`Expected scaffold status patch_ready, received ${scaffoldOutput.status}.`);
    }

    if (scaffoldOutput.proposalOutputPath !== proposalPath) {
      throw new Error('Expected scaffold output to expose saved patch proposal path.');
    }

    await this.assertFileMissing(
      resolve(fixture.projectRoot, 'src/modules/auth/index.ts'),
      'Scaffold must not write module files before patch apply.',
    );

    const dryRunResult = await this.cliRunner.run([
      'patch',
      'apply',
      '--project',
      fixture.projectRoot,
      '--proposal',
      proposalPath,
      '--dry-run',
      '--allow-dirty',
    ]);

    this.assertStatus(dryRunResult.status, 'ok', 'patch dry-run');
    const dryRunOutput = this.requireOutputRecord(dryRunResult.output, 'patch dry-run output');

    if (dryRunOutput.status !== 'dry_run') {
      throw new Error(`Expected patch dry-run status dry_run, received ${dryRunOutput.status}.`);
    }

    await this.assertFileMissing(
      resolve(fixture.projectRoot, 'src/modules/auth/index.ts'),
      'Patch dry-run must not write module files.',
    );

    const applyResult = await this.cliRunner.run([
      'patch',
      'apply',
      '--project',
      fixture.projectRoot,
      '--proposal',
      proposalPath,
      '--confirm-apply',
      '--allow-dirty',
    ]);

    this.assertStatus(applyResult.status, 'ok', 'patch apply');
    const applyOutput = this.requireOutputRecord(applyResult.output, 'patch apply output');

    if (applyOutput.status !== 'applied') {
      throw new Error(`Expected patch apply status applied, received ${applyOutput.status}.`);
    }

    const generatedFiles = [
      'src/modules/auth/index.ts',
      'src/modules/auth/auth.service.ts',
      'src/modules/auth/auth.types.ts',
    ];

    await this.assertGeneratedAuthModule(fixture.projectRoot);

    const validateResult = await this.cliRunner.run([
      'validate',
      '--project',
      fixture.projectRoot,
      '--target',
      'src/index.ts',
      '--target',
      'src/modules/auth/index.ts',
      '--target',
      'src/modules/auth/auth.service.ts',
      '--target',
      'src/modules/auth/auth.types.ts',
      '--name',
      'Zero Runtime Quickstart Demo',
      '--objective',
      'Validate generated quickstart module after controlled patch application.',
    ]);

    this.assertStatus(validateResult.status, 'ok', 'quickstart validation');
    const validateOutput = this.requireOutputRecord(validateResult.output, 'validate output');
    const validationStatus = validateOutput.validation?.status ?? 'unknown';

    if (validationStatus !== 'passed') {
      throw new Error(
        `Expected quickstart validation status passed, received ${validationStatus}.`,
      );
    }

    const gitStatusResult = await this.cliRunner.run([
      'git',
      'status',
      '--project',
      fixture.projectRoot,
    ]);

    this.assertStatus(gitStatusResult.status, 'ok', 'quickstart git status');
    const gitSummary = this.extractGitSummary(gitStatusResult.output);

    const changedFiles = this.mergeChangedFiles([
      ...gitSummary.changedFiles,
      proposalRelativePath,
      '.runtime/quickstart-report.md',
      ...generatedFiles,
    ]);

    const result: DemoScenarioResult = {
      status: 'ok',
      projectRoot: fixture.projectRoot,
      proposalPath,
      reportPath,
      scaffoldStatus: scaffoldOutput.status,
      dryRunStatus: dryRunOutput.status,
      applyStatus: applyOutput.status,
      validationStatus,
      gitWorkingTreeStatus: gitSummary.workingTreeStatus,
      changedFiles,
      generatedFiles,
    };

    await this.reporter.write({
      reportPath,
      result,
    });

    return result;
  }

  private extractGitSummary(output: unknown): GitSummary {
    const record = this.requireGitOutputRecord(output, 'git status output');
    const status = record.status;
    const changedFiles = [
      ...(status?.modifiedFiles ?? []),
      ...(status?.untrackedFiles ?? []),
      ...(status?.deletedFiles ?? []),
    ];

    return {
      workingTreeStatus: status?.workingTreeState ?? (status?.clean === true ? 'clean' : 'dirty'),
      changedFiles: [...new Set(changedFiles)].sort(),
    };
  }
  private mergeChangedFiles(files: readonly string[]): readonly string[] {
    return [...new Set(files)].map((file) => file.replaceAll('\\', '/')).sort();
  }
  private async assertGeneratedAuthModule(projectRoot: string): Promise<void> {
    const indexContent = await readFile(resolve(projectRoot, 'src/modules/auth/index.ts'), 'utf8');
    const serviceContent = await readFile(
      resolve(projectRoot, 'src/modules/auth/auth.service.ts'),
      'utf8',
    );
    const typesContent = await readFile(
      resolve(projectRoot, 'src/modules/auth/auth.types.ts'),
      'utf8',
    );

    if (!indexContent.includes("export * from './auth.service.js';")) {
      throw new Error('Expected generated auth index export.');
    }

    if (!serviceContent.includes('export class AuthService')) {
      throw new Error('Expected generated AuthService class.');
    }

    if (!typesContent.includes('export interface AuthConfig')) {
      throw new Error('Expected generated AuthConfig interface.');
    }
  }

  private async assertFileMissing(path: string, message: string): Promise<void> {
    try {
      await readFile(path, 'utf8');
    } catch {
      return;
    }

    throw new Error(message);
  }

  private assertStatus(actual: string, expected: string, label: string): void {
    if (actual !== expected) {
      throw new Error(`Expected ${label} status ${expected}, received ${actual}.`);
    }
  }

  private requireOutputRecord(output: unknown, label: string): CliOutputRecord {
    if (typeof output !== 'object' || output === null || Array.isArray(output)) {
      throw new Error(`Expected object output: ${label}.`);
    }

    return output;
  }

  private requireGitOutputRecord(output: unknown, label: string): GitStatusCliOutputRecord {
    if (typeof output !== 'object' || output === null || Array.isArray(output)) {
      throw new Error(`Expected object output: ${label}.`);
    }

    return output;
  }
}
