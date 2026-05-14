import type { CliRunResult } from './CliTypes.js';

export class CliOutputFormatter {
  public format(result: CliRunResult, format: 'text' | 'json'): string {
    if (format === 'json') {
      return JSON.stringify(result, null, 2);
    }

    if (typeof result.output === 'string') {
      return result.output;
    }

    return JSON.stringify(result.output, null, 2);
  }
}
