import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { RuntimeLoopState } from '../types/RuntimeLoopTypes.js';

export class RuntimeLoopReporter {
  private readonly reportPath: string;

  public constructor(reportPath = '.runtime/runtime-loop.md') {
    this.reportPath = path.resolve(process.cwd(), reportPath);
  }

  public async append(state: RuntimeLoopState): Promise<void> {
    await mkdir(path.dirname(this.reportPath), {
      recursive: true,
    });

    await appendFile(this.reportPath, this.format(state), 'utf8');
  }

  private format(state: RuntimeLoopState): string {
    const issues = state.issues.length === 0 ? 'none' : state.issues.join('; ');

    return [
      `## ${state.updatedAt} — ${state.id}`,
      '',
      `- Status: ${state.status}`,
      `- Objective: ${state.objective?.objective ?? 'none'}`,
      `- Module: ${state.objective?.module ?? 'none'}`,
      `- Plan: ${state.plan?.id ?? 'none'}`,
      `- Review: ${state.review?.status ?? 'none'}`,
      `- Step result: ${state.stepResult?.step.status ?? 'none'}`,
      `- Issues: ${issues}`,
      '',
    ].join('\n');
  }
}
