import { mkdir, writeFile } from 'node:fs/promises';
import { normalize, relative, resolve } from 'node:path';
import { SensitiveDataRedactor } from '../observability/SensitiveDataRedactor.js';
import type { BenchmarkReporterOutput } from '../types/BenchmarkTypes.js';
import type { JsonObject } from '../types/SharedTypes.js';

export interface BenchmarkReportWriterOptions {
  outputDir?: string | undefined;
  redactor?: SensitiveDataRedactor | undefined;
}

export interface BenchmarkReportWriteInput {
  runId: string;
  report: BenchmarkReporterOutput;
  overwrite?: boolean | undefined;
}

export interface BenchmarkReportWriteResult {
  runId: string;
  markdownPath: string;
  jsonPath: string;
  writtenAt: string;
}

export class BenchmarkReportWriter {
  private readonly outputDir: string;
  private readonly redactor: SensitiveDataRedactor;

  public constructor(options: BenchmarkReportWriterOptions = {}) {
    this.outputDir = resolve(options.outputDir ?? '.runtime/benchmarks');
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
  }

  public async write(input: BenchmarkReportWriteInput): Promise<BenchmarkReportWriteResult> {
    const safeRunId = this.sanitizeRunId(input.runId);
    const benchmarkDir = resolve(this.outputDir, safeRunId);

    await this.assertInsideOutputDir(benchmarkDir);
    await mkdir(benchmarkDir, {
      recursive: true,
    });

    const markdownPath = resolve(benchmarkDir, 'report.md');
    const jsonPath = resolve(benchmarkDir, 'report.json');

    await this.assertInsideOutputDir(markdownPath);
    await this.assertInsideOutputDir(jsonPath);

    const sanitizedMarkdown = this.redactText(input.report.markdown);
    const sanitizedJson = this.redactor.redactObject(input.report.json);

    await writeFile(markdownPath, sanitizedMarkdown, {
      encoding: 'utf8',
      flag: input.overwrite === true ? 'w' : 'wx',
    });

    await writeFile(jsonPath, `${JSON.stringify(sanitizedJson, null, 2)}\n`, {
      encoding: 'utf8',
      flag: input.overwrite === true ? 'w' : 'wx',
    });

    return {
      runId: safeRunId,
      markdownPath,
      jsonPath,
      writtenAt: new Date().toISOString(),
    };
  }

  public sanitizeJson(value: JsonObject): JsonObject {
    return this.redactor.redactObject(value);
  }

  private sanitizeRunId(runId: string): string {
    const sanitized = runId.replaceAll(/[^a-zA-Z0-9._-]/g, '-');

    if (!sanitized) {
      throw new Error('Benchmark report runId cannot be empty.');
    }

    return sanitized;
  }

  private redactText(value: string): string {
    const redacted = this.redactor.redact(value);

    return typeof redacted === 'string' ? redacted : JSON.stringify(redacted);
  }

  private async assertInsideOutputDir(targetPath: string): Promise<void> {
    const normalizedRoot = normalize(this.outputDir);
    const normalizedTarget = normalize(targetPath);
    const pathFromRoot = relative(normalizedRoot, normalizedTarget);

    if (pathFromRoot.startsWith('..') || pathFromRoot === '..') {
      throw new Error(`Benchmark report path escapes output directory: ${targetPath}`);
    }

    await Promise.resolve();
  }
}
