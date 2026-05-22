import { mkdir, writeFile } from 'node:fs/promises';
import path, { dirname, resolve } from 'node:path';
import { JsonReportExporter } from './JsonReportExporter.js';
import { MarkdownReportExporter } from './MarkdownReportExporter.js';
import type { SessionReport } from './SessionReportBuilder.js';

export interface ReportStorageOptions {
  rootDir?: string | undefined;
  markdownExporter?: MarkdownReportExporter | undefined;
  jsonExporter?: JsonReportExporter | undefined;
}

export interface ReportStorageResult {
  sessionId: string;
  markdownPath: string;
  jsonPath: string;
}

export class ReportStorage {
  private readonly rootDir: string;
  private readonly markdownExporter: MarkdownReportExporter;
  private readonly jsonExporter: JsonReportExporter;

  public constructor(options: ReportStorageOptions = {}) {
    this.rootDir = resolve(options.rootDir ?? '.runtime/reports');
    this.markdownExporter = options.markdownExporter ?? new MarkdownReportExporter();
    this.jsonExporter = options.jsonExporter ?? new JsonReportExporter();
  }

  public async save(report: SessionReport): Promise<ReportStorageResult> {
    const markdownPath = this.resolveMarkdownPath(report.sessionId);
    const jsonPath = this.resolveJsonPath(report.sessionId);

    await mkdir(dirname(markdownPath), {
      recursive: true,
    });

    await writeFile(markdownPath, this.markdownExporter.export(report), 'utf8');
    await writeFile(jsonPath, this.jsonExporter.export(report), 'utf8');

    return {
      sessionId: report.sessionId,
      markdownPath,
      jsonPath,
    };
  }

  public resolveMarkdownPath(sessionId: string): string {
    return path.join(this.rootDir, `${sessionId}.md`);
  }

  public resolveJsonPath(sessionId: string): string {
    return path.join(this.rootDir, `${sessionId}.json`);
  }
}
