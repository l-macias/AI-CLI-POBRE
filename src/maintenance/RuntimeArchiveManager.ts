import { mkdir, rename, stat } from 'node:fs/promises';
import path, { dirname, resolve } from 'node:path';
import type {
  RuntimeArchiveMovedPath,
  RuntimeArchiveSessionInput,
  RuntimeArchiveSessionResult,
  RuntimeArchiveSessionsResult,
  RuntimeRestoreSessionInput,
  RuntimeRestoreSessionResult,
  RuntimeRestoreSessionsResult,
} from './RuntimeMaintenanceTypes.js';

const sessionScopedDirectories = [
  'interactive-sessions',
  'plans',
  'patch-proposals',
  'patch-diffs',
  'sandbox-results',
  'patch-recoveries',
  'approval-decisions',
  'tasks',
  'verify-runs',
  'session-decisions',
];

export interface RuntimeArchiveManagerOptions {
  runtimeRoot?: string | undefined;
}

export class RuntimeArchiveManager {
  private readonly runtimeRoot: string;

  public constructor(options: RuntimeArchiveManagerOptions = {}) {
    this.runtimeRoot = resolve(options.runtimeRoot ?? '.runtime');
  }

  public async archiveSessions(
    input: RuntimeArchiveSessionInput,
  ): Promise<RuntimeArchiveSessionsResult> {
    const uniqueSessionIds = this.uniqueSessionIds(input.sessionIds);
    const dryRun = input.dryRun === true;
    const results: RuntimeArchiveSessionResult[] = [];

    for (const sessionId of uniqueSessionIds) {
      results.push(await this.archiveSession({ sessionId, dryRun }));
    }

    return {
      version: 1,
      archivedAt: new Date().toISOString(),
      dryRun,
      results,
    };
  }

  public async restoreSessions(
    input: RuntimeRestoreSessionInput,
  ): Promise<RuntimeRestoreSessionsResult> {
    const uniqueSessionIds = this.uniqueSessionIds(input.sessionIds);
    const dryRun = input.dryRun === true;
    const results: RuntimeRestoreSessionResult[] = [];

    for (const sessionId of uniqueSessionIds) {
      results.push(await this.restoreSession({ sessionId, dryRun }));
    }

    return {
      version: 1,
      restoredAt: new Date().toISOString(),
      dryRun,
      results,
    };
  }

  private async archiveSession(input: {
    sessionId: string;
    dryRun: boolean;
  }): Promise<RuntimeArchiveSessionResult> {
    const moved: RuntimeArchiveMovedPath[] = [];
    const skipped: string[] = [];
    const safeSessionId = this.safeSegment(input.sessionId);

    for (const directory of sessionScopedDirectories) {
      const source = path.join(this.runtimeRoot, directory, safeSessionId);
      const target = path.join(this.runtimeRoot, 'archive', 'sessions', safeSessionId, directory);

      await this.moveIfExists({
        source,
        target,
        kind: 'directory',
        dryRun: input.dryRun,
        moved,
        skipped,
      });
    }

    await this.archiveReportIfExists({
      sessionId: input.sessionId,
      safeSessionId,
      extension: 'md',
      dryRun: input.dryRun,
      moved,
      skipped,
    });

    await this.archiveReportIfExists({
      sessionId: input.sessionId,
      safeSessionId,
      extension: 'json',
      dryRun: input.dryRun,
      moved,
      skipped,
    });

    return {
      sessionId: input.sessionId,
      archived: moved.length > 0,
      dryRun: input.dryRun,
      moved,
      skipped,
    };
  }

  private async restoreSession(input: {
    sessionId: string;
    dryRun: boolean;
  }): Promise<RuntimeRestoreSessionResult> {
    const moved: RuntimeArchiveMovedPath[] = [];
    const skipped: string[] = [];
    const safeSessionId = this.safeSegment(input.sessionId);

    for (const directory of sessionScopedDirectories) {
      const source = path.join(this.runtimeRoot, 'archive', 'sessions', safeSessionId, directory);
      const target = path.join(this.runtimeRoot, directory, safeSessionId);

      await this.moveIfExists({
        source,
        target,
        kind: 'directory',
        dryRun: input.dryRun,
        moved,
        skipped,
      });
    }

    await this.restoreReportIfExists({
      safeSessionId,
      extension: 'md',
      dryRun: input.dryRun,
      moved,
      skipped,
    });

    await this.restoreReportIfExists({
      safeSessionId,
      extension: 'json',
      dryRun: input.dryRun,
      moved,
      skipped,
    });

    return {
      sessionId: input.sessionId,
      restored: moved.length > 0,
      dryRun: input.dryRun,
      moved,
      skipped,
    };
  }

  private async archiveReportIfExists(input: {
    sessionId: string;
    safeSessionId: string;
    extension: 'md' | 'json';
    dryRun: boolean;
    moved: RuntimeArchiveMovedPath[];
    skipped: string[];
  }): Promise<void> {
    const candidates = [
      path.join(this.runtimeRoot, 'reports', `${input.sessionId}.${input.extension}`),
      path.join(this.runtimeRoot, 'reports', `${input.safeSessionId}.${input.extension}`),
    ];

    for (const source of candidates) {
      const target = path.join(
        this.runtimeRoot,
        'archive',
        'sessions',
        input.safeSessionId,
        'reports',
        path.basename(source),
      );

      const movedBefore = input.moved.length;

      await this.moveIfExists({
        source,
        target,
        kind: 'file',
        dryRun: input.dryRun,
        moved: input.moved,
        skipped: input.skipped,
      });

      if (input.moved.length > movedBefore) {
        return;
      }
    }
  }

  private async restoreReportIfExists(input: {
    safeSessionId: string;
    extension: 'md' | 'json';
    dryRun: boolean;
    moved: RuntimeArchiveMovedPath[];
    skipped: string[];
  }): Promise<void> {
    const source = path.join(
      this.runtimeRoot,
      'archive',
      'sessions',
      input.safeSessionId,
      'reports',
      `${input.safeSessionId}.${input.extension}`,
    );

    const target = path.join(
      this.runtimeRoot,
      'reports',
      `${input.safeSessionId}.${input.extension}`,
    );

    await this.moveIfExists({
      source,
      target,
      kind: 'file',
      dryRun: input.dryRun,
      moved: input.moved,
      skipped: input.skipped,
    });
  }

  private async moveIfExists(input: {
    source: string;
    target: string;
    kind: 'file' | 'directory';
    dryRun: boolean;
    moved: RuntimeArchiveMovedPath[];
    skipped: string[];
  }): Promise<void> {
    const sourceExists = await this.exists(input.source);

    if (!sourceExists) {
      input.skipped.push(input.source);
      return;
    }

    const targetExists = await this.exists(input.target);

    if (targetExists) {
      input.skipped.push(input.target);
      return;
    }

    input.moved.push({
      from: input.source,
      to: input.target,
      kind: input.kind,
    });

    if (input.dryRun) {
      return;
    }

    await mkdir(dirname(input.target), {
      recursive: true,
    });

    await rename(input.source, input.target);
  }

  private uniqueSessionIds(sessionIds: string[]): string[] {
    return [...new Set(sessionIds.map((sessionId) => sessionId.trim()))].filter(
      (sessionId) => sessionId.length > 0,
    );
  }

  private async exists(absolutePath: string): Promise<boolean> {
    try {
      await stat(absolutePath);

      return true;
    } catch {
      return false;
    }
  }

  private safeSegment(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9._-]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');

    if (normalized.length === 0) {
      throw new Error('Archive session segment cannot be empty.');
    }

    return normalized;
  }
}
