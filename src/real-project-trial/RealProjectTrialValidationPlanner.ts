import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import type {
  RealProjectTrialInspection,
  RealProjectTrialValidationCommand,
} from '../types/RealProjectTrialTypes.js';

export class RealProjectTrialValidationPlanner {
  public async plan(
    inspection: RealProjectTrialInspection,
  ): Promise<RealProjectTrialValidationCommand[]> {
    const commands: RealProjectTrialValidationCommand[] = [];
    const scripts = inspection.packageInfo.scripts;

    const localTscPath = resolve(inspection.projectRoot, 'node_modules/typescript/bin/tsc');

    if (await this.exists(localTscPath)) {
      commands.push({
        id: 'validation-typescript-direct',
        kind: 'node_binary',
        scriptName: 'typescript-direct',
        command: 'node',
        args: [localTscPath, '--noEmit', '--pretty', 'false'],
        reason:
          'Direct local TypeScript validation avoids project build blockers such as Prisma prebuild steps.',
        timeoutMs: 120_000,
        maxOutputBytes: 120_000,
      });
    }

    if (scripts['typecheck']) {
      commands.push({
        id: 'validation-typecheck',
        kind: 'npm_script',
        scriptName: 'typecheck',
        command: 'npm',
        args: ['run', 'typecheck'],
        reason: 'Typecheck script is explicitly available.',
        timeoutMs: 90_000,
        maxOutputBytes: 80_000,
      });
    }

    if (scripts['build']) {
      commands.push({
        id: 'validation-build',
        kind: 'npm_script',
        scriptName: 'build',
        command: 'npm',
        args: ['run', 'build'],
        reason: 'Build is the most complete validation for Next/TypeScript projects.',
        timeoutMs: 120_000,
        maxOutputBytes: 120_000,
      });
    }

    if (scripts['lint'] && scripts['lint'] !== 'next lint') {
      commands.push({
        id: 'validation-lint',
        kind: 'npm_script',
        scriptName: 'lint',
        command: 'npm',
        args: ['run', 'lint'],
        reason: 'Lint script is available and not deprecated Next lint wrapper.',
        timeoutMs: 90_000,
        maxOutputBytes: 80_000,
      });
    }

    if (commands.length === 0) {
      commands.push({
        id: 'validation-noop',
        kind: 'noop',
        scriptName: 'noop',
        command: 'noop',
        args: [],
        reason:
          'No safe validation command was found. Install dependencies or add a typecheck script.',
        timeoutMs: 1_000,
        maxOutputBytes: 1_000,
      });
    }

    return commands;
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
