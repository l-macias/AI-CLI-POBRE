import { SensitiveDataRedactor } from './SensitiveDataRedactor.js';
import type { ObservabilitySeverity, RuntimeErrorReport } from '../types/ObservabilityTypes.js';

export interface ErrorReporterOptions {
  redactor?: SensitiveDataRedactor | undefined;
}

export class ErrorReporter {
  private readonly reports: RuntimeErrorReport[] = [];
  private readonly redactor: SensitiveDataRedactor;

  public constructor(options: ErrorReporterOptions = {}) {
    this.redactor = options.redactor ?? new SensitiveDataRedactor();
  }

  public report(input: {
    source: string;
    error: unknown;
    code?: string | undefined;
    severity?: ObservabilitySeverity | undefined;
    metadata?: unknown;
  }): RuntimeErrorReport {
    const timestamp = new Date().toISOString();

    const report: RuntimeErrorReport = {
      id: `error-${timestamp.replaceAll(':', '').replaceAll('.', '')}-${this.reports.length + 1}`,
      source: input.source,
      code: input.code ?? 'RUNTIME_ERROR',
      message: this.resolveMessage(input.error),
      severity: input.severity ?? 'error',
      reportedAt: timestamp,
    };

    if (typeof input.metadata !== 'undefined') {
      report.metadata = this.redactor.redactObject(input.metadata);
    }

    this.reports.push(report);

    return report;
  }

  public list(): RuntimeErrorReport[] {
    return [...this.reports];
  }

  public clear(): void {
    this.reports.length = 0;
  }

  private resolveMessage(error: unknown): string {
    if (error instanceof Error) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return this.redactor.redact(error.message)?.toString() ?? '';
    }

    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return this.redactor.redact(error)?.toString() ?? '';
  }
}
