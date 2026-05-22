import type { SessionReport } from './SessionReportBuilder.js';

export class JsonReportExporter {
  public export(report: SessionReport): string {
    return `${JSON.stringify(report, null, 2)}\n`;
  }
}
