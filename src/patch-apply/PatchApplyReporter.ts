import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { SensitiveDataRedactor } from '../observability/SensitiveDataRedactor.js';
import type { PatchApplyResult } from './PatchApplyTypes.js';

export interface PatchApplyReporterOptions {
  outputPath?: string | undefined;
  redactor?: SensitiveDataRedactor | undefined;
}

export class PatchApplyReporter {
  private readonly outputPath: string;
  private readonly redactor: SensitiveDataRedactor;

  public constructor(options: PatchApplyReporterOptions | string = {}) {
    if (typeof options === 'string') {
      this.outputPath = resolve(options);
      this.redactor = new SensitiveDataRedactor();
      return;
    }

    this.outputPath = resolve(options.outputPath ?? '.runtime/patch-apply-report.json');
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
  }

  public async write(result: PatchApplyResult): Promise<string> {
    const redacted = this.redactor.redactObject(result);

    await mkdir(dirname(this.outputPath), {
      recursive: true,
    });

    await writeFile(this.outputPath, `${JSON.stringify(redacted, null, 2)}\n`, 'utf8');

    return this.outputPath;
  }
}
