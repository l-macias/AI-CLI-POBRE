import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { FailureHistoryEntry } from '../types/FailureTypes.js';

export class FailureHistory {
  private readonly historyPath: string;

  public constructor(historyPath = '.runtime/failure-history.md') {
    this.historyPath = path.resolve(process.cwd(), historyPath);
  }

  public async append(entry: FailureHistoryEntry): Promise<void> {
    await mkdir(path.dirname(this.historyPath), {
      recursive: true,
    });

    await appendFile(this.historyPath, this.format(entry), 'utf8');
  }

  private format(entry: FailureHistoryEntry): string {
    const issues =
      entry.failure.issues.length === 0
        ? 'none'
        : entry.failure.issues.map((issue) => `${issue.code}: ${issue.message}`).join('; ');

    return [
      `## ${entry.timestamp} — ${entry.failure.id}`,
      '',
      `- Kind: ${entry.failure.kind}`,
      `- Action: ${entry.action}`,
      `- Recovered: ${String(entry.recovered)}`,
      `- Plan: ${entry.failure.planId ?? 'none'}`,
      `- Step: ${entry.failure.stepId ?? 'none'}`,
      `- Retryable: ${String(entry.failure.retryable)}`,
      `- Replan allowed: ${String(entry.failure.replanAllowed)}`,
      `- Reason: ${entry.reason}`,
      `- Issues: ${issues}`,
      '',
    ].join('\n');
  }
}
