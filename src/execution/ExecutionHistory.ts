import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { ExecutionHistoryEntry } from '../types/ExecutionTypes.js';

export class ExecutionHistory {
  private readonly historyPath: string;

  public constructor(historyPath = '.runtime/execution-history.md') {
    this.historyPath = path.resolve(process.cwd(), historyPath);
  }

  public async append(entry: ExecutionHistoryEntry): Promise<void> {
    await mkdir(path.dirname(this.historyPath), {
      recursive: true,
    });

    await appendFile(this.historyPath, this.formatEntry(entry), 'utf8');
  }

  private formatEntry(entry: ExecutionHistoryEntry): string {
    const issues =
      entry.issues.length === 0
        ? 'none'
        : entry.issues.map((issue) => `${issue.code}: ${issue.message}`).join('; ');

    return [
      `## ${entry.timestamp} — Step ${entry.stepId}`,
      '',
      `- Run: ${entry.runId}`,
      `- Plan: ${entry.planId}`,
      `- Step status: ${entry.status}`,
      `- Tool: ${entry.toolName}`,
      `- Tool status: ${entry.toolStatus}`,
      `- Issues: ${issues}`,
      '',
    ].join('\n');
  }
}
