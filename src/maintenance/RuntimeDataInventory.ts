import { readdir, stat } from 'node:fs/promises';
import path, { resolve } from 'node:path';
import type {
  RuntimeDataInventoryDirectory,
  RuntimeDataInventoryOptions,
  RuntimeDataInventoryReport,
  RuntimeDataInventorySession,
} from './RuntimeMaintenanceTypes.js';

interface FileSystemScanResult {
  fileCount: number;
  directoryCount: number;
  sizeBytes: number;
}

interface RuntimeDiscoveredFile {
  relativePath: string;
  sizeBytes: number;
}

const trackedDirectories = [
  'interactive-sessions',
  'plans',
  'patch-proposals',
  'patch-diffs',
  'sandbox-results',
  'patch-recoveries',
  'approval-decisions',
  'reports',
  'tasks',
  'verify-runs',
  'session-decisions',
  'snapshots',
  'workspace-snapshots',
];

export class RuntimeDataInventory {
  private readonly runtimeRoot: string;

  public constructor(options: RuntimeDataInventoryOptions = {}) {
    this.runtimeRoot = resolve(options.runtimeRoot ?? '.runtime');
  }

  public async inspect(): Promise<RuntimeDataInventoryReport> {
    const [rootScan, files, directories] = await Promise.all([
      this.scanDirectory(this.runtimeRoot),
      this.discoverFiles(this.runtimeRoot),
      this.inspectTrackedDirectories(),
    ]);

    const sessions = this.buildSessions(files);
    const suspectedTestSessions = sessions.filter((session) => session.suspectedTest).length;
    const archivedSessions = sessions.filter((session) => session.status === 'archived').length;

    const suspectedTestArtifacts = files.filter((file) =>
      this.isSuspectedTestPath(file.relativePath),
    ).length;
    const archivedArtifacts = files.filter((file) => this.isArchivedPath(file.relativePath)).length;

    return {
      version: 1,
      runtimeRoot: this.runtimeRoot,
      generatedAt: new Date().toISOString(),
      totals: {
        files: rootScan.fileCount,
        directories: rootScan.directoryCount,
        sizeBytes: rootScan.sizeBytes,
        sessions: {
          total: sessions.length,
          active: sessions.length - archivedSessions,
          archived: archivedSessions,
          suspectedTest: suspectedTestSessions,
        },
        artifacts: {
          total: files.length,
          active: files.length - archivedArtifacts,
          archived: archivedArtifacts,
          suspectedTest: suspectedTestArtifacts,
        },
      },
      directories,
      sessions,
      recommendations: this.buildRecommendations({
        sessions,
        files,
        rootScan,
      }),
    };
  }

  private async inspectTrackedDirectories(): Promise<RuntimeDataInventoryDirectory[]> {
    const directories: RuntimeDataInventoryDirectory[] = [];

    for (const directory of trackedDirectories) {
      const absolutePath = path.join(this.runtimeRoot, directory);
      const scan = await this.scanDirectory(absolutePath);

      directories.push({
        name: directory,
        path: absolutePath,
        exists: scan.fileCount > 0 || scan.directoryCount > 0 || (await this.exists(absolutePath)),
        fileCount: scan.fileCount,
        directoryCount: scan.directoryCount,
        sizeBytes: scan.sizeBytes,
      });
    }

    return directories;
  }

  private buildSessions(files: RuntimeDiscoveredFile[]): RuntimeDataInventorySession[] {
    const sessions = new Map<string, RuntimeDataInventorySession>();

    for (const file of files) {
      const sessionId = this.extractSessionId(file.relativePath);

      if (!sessionId) {
        continue;
      }

      const current = sessions.get(sessionId) ?? {
        sessionId,
        status: this.isArchivedPath(file.relativePath) ? 'archived' : 'active',
        suspectedTest: false,
        artifactCount: 0,
        sizeBytes: 0,
      };

      current.artifactCount += 1;
      current.sizeBytes += file.sizeBytes;
      current.suspectedTest = current.suspectedTest || this.isSuspectedTestSession(sessionId);
      current.status =
        current.status === 'archived' || this.isArchivedPath(file.relativePath)
          ? 'archived'
          : 'active';

      sessions.set(sessionId, current);
    }

    return [...sessions.values()].sort((left, right) => {
      if (left.status !== right.status) {
        return left.status.localeCompare(right.status);
      }

      return right.artifactCount - left.artifactCount;
    });
  }

  private extractSessionId(relativePath: string): string | null {
    const parts = relativePath.split('/');

    if (parts[0] === 'reports') {
      const fileName = parts[1];

      return fileName ? fileName.replace(/\.json$|\.md$/u, '') : null;
    }

    if (
      parts[0] === 'interactive-sessions' ||
      parts[0] === 'plans' ||
      parts[0] === 'patch-proposals' ||
      parts[0] === 'patch-diffs' ||
      parts[0] === 'sandbox-results' ||
      parts[0] === 'patch-recoveries' ||
      parts[0] === 'approval-decisions' ||
      parts[0] === 'tasks' ||
      parts[0] === 'verify-runs' ||
      parts[0] === 'session-decisions'
    ) {
      return parts[1] ?? null;
    }

    if (parts[0] === 'archive' && parts.length >= 3) {
      return parts[2] ?? null;
    }

    return null;
  }

  private async discoverFiles(directory: string): Promise<RuntimeDiscoveredFile[]> {
    const files: RuntimeDiscoveredFile[] = [];

    try {
      const entries = await readdir(directory, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const absolutePath = path.join(directory, entry.name);

        if (this.shouldSkipPath(absolutePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          files.push(...(await this.discoverFiles(absolutePath)));
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        const stats = await stat(absolutePath);

        files.push({
          relativePath: path.relative(this.runtimeRoot, absolutePath).replaceAll('\\', '/'),
          sizeBytes: stats.size,
        });
      }

      return files;
    } catch {
      return [];
    }
  }

  private async scanDirectory(directory: string): Promise<FileSystemScanResult> {
    try {
      const entries = await readdir(directory, {
        withFileTypes: true,
      });

      let fileCount = 0;
      let directoryCount = 0;
      let sizeBytes = 0;

      for (const entry of entries) {
        const absolutePath = path.join(directory, entry.name);

        if (this.shouldSkipPath(absolutePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          directoryCount += 1;

          const child = await this.scanDirectory(absolutePath);

          fileCount += child.fileCount;
          directoryCount += child.directoryCount;
          sizeBytes += child.sizeBytes;
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        const stats = await stat(absolutePath);

        fileCount += 1;
        sizeBytes += stats.size;
      }

      return {
        fileCount,
        directoryCount,
        sizeBytes,
      };
    } catch {
      return {
        fileCount: 0,
        directoryCount: 0,
        sizeBytes: 0,
      };
    }
  }

  private async exists(absolutePath: string): Promise<boolean> {
    try {
      await stat(absolutePath);

      return true;
    } catch {
      return false;
    }
  }

  private shouldSkipPath(absolutePath: string): boolean {
    const normalized = absolutePath.replaceAll('\\', '/').toLowerCase();

    return normalized.includes('/node_modules/') || normalized.includes('/.git/');
  }

  private isArchivedPath(relativePath: string): boolean {
    return relativePath.startsWith('archive/');
  }

  private isSuspectedTestPath(relativePath: string): boolean {
    return this.isSuspectedTestSession(relativePath);
  }

  private isSuspectedTestSession(value: string): boolean {
    const normalized = value.toLowerCase();

    return (
      normalized.includes('test') ||
      normalized.includes('fixture') ||
      normalized.includes('sandbox') ||
      normalized.includes('e2e') ||
      normalized.includes('smoke') ||
      normalized.includes('trial')
    );
  }

  private buildRecommendations(input: {
    sessions: RuntimeDataInventorySession[];
    files: RuntimeDiscoveredFile[];
    rootScan: FileSystemScanResult;
  }): string[] {
    const recommendations: string[] = [];

    const suspectedTestSessions = input.sessions.filter((session) => session.suspectedTest).length;

    if (suspectedTestSessions > 0) {
      recommendations.push(
        `Archive ${suspectedTestSessions} suspected test session(s) to keep the main UI clean.`,
      );
    }

    if (input.files.length > 300) {
      recommendations.push('Runtime artifact count is high. Consider archiving old sessions.');
    }

    if (input.rootScan.sizeBytes > 50 * 1024 * 1024) {
      recommendations.push(
        'Runtime data size is above 50MB. Consider archiving or exporting old data.',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Runtime data looks manageable. No cleanup action is required.');
    }

    return recommendations;
  }
}
