import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RuntimePlanGenerationResult } from './RuntimePlan.js';

export interface PlanStorageSaveResult {
  planPath: string;
  activePlanPath: string;
}

export class PlanStorage {
  public async save(result: RuntimePlanGenerationResult): Promise<PlanStorageSaveResult> {
    const planDirectory = path.resolve(
      '.runtime',
      'plans',
      this.safeSegment(result.plan.sessionId),
    );

    await mkdir(planDirectory, {
      recursive: true,
    });

    const planPath = path.join(planDirectory, `${this.safeSegment(result.plan.id)}.json`);
    const activePlanPath = path.resolve('.runtime', 'active-runtime-plan.json');

    const serialized = `${JSON.stringify(result, null, 2)}\n`;

    await writeFile(planPath, serialized, 'utf8');
    await writeFile(activePlanPath, serialized, 'utf8');

    return {
      planPath,
      activePlanPath,
    };
  }

  private safeSegment(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9._-]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    if (normalized.length === 0) {
      throw new Error('Plan storage segment cannot be empty.');
    }

    return normalized;
  }
}
