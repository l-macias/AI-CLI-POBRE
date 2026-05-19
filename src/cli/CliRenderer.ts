import { CliOutputFormatter } from './CliOutputFormatter.js';
import type { CliOutputFormat, CliRunResult } from './CliTypes.js';

export interface CliRendererOptions {
  formatter?: CliOutputFormatter | undefined;
}

export class CliRenderer {
  private readonly formatter: CliOutputFormatter;

  public constructor(options: CliRendererOptions = {}) {
    this.formatter = options.formatter ?? new CliOutputFormatter();
  }

  public render(result: CliRunResult, format: CliOutputFormat): string {
    return this.formatter.format(result, format);
  }
}
