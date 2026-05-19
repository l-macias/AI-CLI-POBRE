import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { SensitiveDataRedactor } from '../observability/SensitiveDataRedactor.js';
import type { ScaffoldRunResult } from './ScaffoldTypes.js';

export interface ScaffoldReporterOptions {
  outputPath?: string | undefined;
  redactor?: SensitiveDataRedactor | undefined;
}

export class ScaffoldReporter {
  private readonly outputPath: string;
  private readonly redactor: SensitiveDataRedactor;

  public constructor(options: ScaffoldReporterOptions = {}) {
    this.outputPath = resolve(options.outputPath ?? '.runtime/scaffold-report.json');
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
  }

  public async write(result: ScaffoldRunResult): Promise<string> {
    const redacted = this.redactor.redactObject(result);

    await mkdir(dirname(this.outputPath), {
      recursive: true,
    });

    await writeFile(this.outputPath, `${JSON.stringify(redacted, null, 2)}\n`, 'utf8');

    return this.outputPath;
  }
}
