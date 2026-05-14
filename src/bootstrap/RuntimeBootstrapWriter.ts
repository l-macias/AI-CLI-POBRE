import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  RuntimeBootstrapFile,
  RuntimeBootstrapPlanIssue,
  RuntimeBootstrapWriteInput,
  RuntimeBootstrapWriteResult,
} from './BootstrapTypes.js';
import { RuntimeBootstrapPlanner } from './RuntimeBootstrapPlanner.js';

export interface RuntimeBootstrapWriterOptions {
  planner?: RuntimeBootstrapPlanner | undefined;
}

export class RuntimeBootstrapWriter {
  private readonly planner: RuntimeBootstrapPlanner;

  public constructor(options: RuntimeBootstrapWriterOptions = {}) {
    this.planner = options.planner ?? new RuntimeBootstrapPlanner();
  }

  public async write(input: RuntimeBootstrapWriteInput): Promise<RuntimeBootstrapWriteResult> {
    const plan = await this.planner.plan(input.rootDir);
    const confirmOverwrite = input.confirmOverwrite ?? false;

    if (!input.confirmCreate) {
      return {
        rootDir: input.rootDir,
        status: 'blocked',
        writtenFiles: [],
        skippedFiles: plan.files.map((file) => file.relativePath),
        issues: [
          ...plan.issues,
          {
            code: 'BOOTSTRAP_CREATE_NOT_CONFIRMED',
            message: 'Bootstrap write requires confirmCreate: true.',
            severity: 'error',
          },
        ],
        createdAt: new Date().toISOString(),
      };
    }

    if (plan.inspection.runtimeExists && !confirmOverwrite) {
      return {
        rootDir: input.rootDir,
        status: 'blocked',
        writtenFiles: [],
        skippedFiles: plan.files.map((file) => file.relativePath),
        issues: [
          ...plan.issues,
          {
            code: 'BOOTSTRAP_OVERWRITE_NOT_CONFIRMED',
            message: '.runtime already exists. Refusing to write without confirmOverwrite: true.',
            severity: 'error',
          },
        ],
        createdAt: new Date().toISOString(),
      };
    }

    return this.writeFiles(input.rootDir, plan.files, confirmOverwrite, plan.issues);
  }

  private async writeFiles(
    rootDir: string,
    files: RuntimeBootstrapFile[],
    confirmOverwrite: boolean,
    issues: RuntimeBootstrapPlanIssue[],
  ): Promise<RuntimeBootstrapWriteResult> {
    const writtenFiles: string[] = [];
    const skippedFiles: string[] = [];

    await mkdir(path.join(rootDir, '.runtime'), {
      recursive: true,
    });

    for (const file of files) {
      const absolutePath = path.join(rootDir, file.relativePath);
      const exists = await this.fileExists(absolutePath);

      if (exists && !confirmOverwrite) {
        skippedFiles.push(file.relativePath);
        continue;
      }

      await mkdir(path.dirname(absolutePath), {
        recursive: true,
      });

      await writeFile(absolutePath, file.content, 'utf8');
      writtenFiles.push(file.relativePath);
    }

    return {
      rootDir,
      status: 'written',
      writtenFiles,
      skippedFiles,
      issues,
      createdAt: new Date().toISOString(),
    };
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const result = await stat(filePath);

      return result.isFile();
    } catch {
      return false;
    }
  }
}
