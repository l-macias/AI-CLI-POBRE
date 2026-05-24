import { readdir, readFile, stat } from 'node:fs/promises';
import path, { resolve } from 'node:path';
import type {
  RuntimeArtifactIndex,
  RuntimeArtifactKind,
  RuntimeArtifactReadResult,
  RuntimeArtifactStoreOptions,
  RuntimeArtifactSummary,
} from './RuntimeArtifactTypes.js';
import type { JsonObject } from '../types/SharedTypes.js';

interface DiscoveredFile {
  absolutePath: string;
  relativePath: string;
  sizeBytes: number;
}

export class RuntimeArtifactStore {
  private readonly rootDir: string;

  public constructor(options: RuntimeArtifactStoreOptions = {}) {
    this.rootDir = resolve(options.rootDir ?? '.runtime');
  }

  public async index(): Promise<RuntimeArtifactIndex> {
    const files = await this.discoverFiles(this.rootDir);

    const artifacts = files
      .map((file) => this.toArtifact(file))
      .sort((left, right) => {
        const leftDate = left.updatedAt ?? left.createdAt ?? '';
        const rightDate = right.updatedAt ?? right.createdAt ?? '';

        if (rightDate !== leftDate) {
          return rightDate.localeCompare(leftDate);
        }

        return left.path.localeCompare(right.path);
      });

    return {
      version: 1,
      rootDir: this.rootDir,
      artifacts,
      generatedAt: new Date().toISOString(),
    };
  }

  public async read(relativePath: string): Promise<RuntimeArtifactReadResult> {
    const normalized = this.normalizeRelativePath(relativePath);
    const absolutePath = path.join(this.rootDir, normalized);

    if (!absolutePath.startsWith(this.rootDir)) {
      throw new Error('Artifact path escapes runtime root.');
    }

    const content = await readFile(absolutePath, 'utf8');
    const stats = await stat(absolutePath);
    const artifact = this.toArtifact({
      absolutePath,
      relativePath: normalized,
      sizeBytes: stats.size,
    });

    return {
      artifact,
      content,
    };
  }

  private async discoverFiles(directory: string): Promise<DiscoveredFile[]> {
    const entries = await readdir(directory, {
      withFileTypes: true,
    });

    const files: DiscoveredFile[] = [];

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
        absolutePath,
        relativePath: path.relative(this.rootDir, absolutePath).replaceAll('\\', '/'),
        sizeBytes: stats.size,
      });
    }

    return files;
  }

  private shouldSkipPath(absolutePath: string): boolean {
    const normalized = absolutePath.replaceAll('\\', '/').toLowerCase();

    return (
      normalized.includes('/node_modules/') ||
      normalized.includes('/.git/') ||
      normalized.includes('/patch-apply-tests/') ||
      normalized.includes('/runtime-patch-apply-bridge-test/') ||
      normalized.includes('/runtime-patch-rollback-test/')
    );
  }

  private toArtifact(file: DiscoveredFile): RuntimeArtifactSummary {
    const kind = this.detectKind(file.relativePath);
    const sessionId = this.extractSessionId(file.relativePath);
    const label = this.createLabel(file.relativePath, kind);

    return {
      id: this.createArtifactId(file.relativePath),
      kind,
      label,
      path: file.relativePath,
      ...(sessionId ? { sessionId } : {}),
      sizeBytes: file.sizeBytes,
      metadata: this.buildMetadata(file.relativePath, kind),
    };
  }

  private detectKind(relativePath: string): RuntimeArtifactKind {
    if (relativePath === 'active-runtime-plan.json') {
      return 'active_plan';
    }

    if (relativePath === 'active-patch-proposal.json') {
      return 'active_patch_proposal';
    }

    if (relativePath === 'active-patch-diff.json') {
      return 'active_patch_diff';
    }

    if (relativePath === 'patch-apply-report.json') {
      return 'apply_report';
    }

    if (relativePath.startsWith('plans/') && relativePath.endsWith('.json')) {
      return 'runtime_plan';
    }

    if (relativePath.startsWith('patch-proposals/') && relativePath.endsWith('.json')) {
      return 'patch_proposal';
    }

    if (relativePath.startsWith('patch-diffs/') && relativePath.endsWith('.json')) {
      return 'patch_diff';
    }

    if (
      relativePath.startsWith('interactive-sessions/') &&
      relativePath.endsWith('session-state.json')
    ) {
      return 'session_state';
    }

    if (relativePath.startsWith('tasks/') && relativePath.endsWith('tasks.json')) {
      return 'task_state';
    }

    if (relativePath.startsWith('verify-runs/') && relativePath.endsWith('verify-runs.json')) {
      return 'verify_runs';
    }

    if (relativePath.startsWith('session-decisions/') && relativePath.endsWith('decisions.json')) {
      return 'session_decisions';
    }

    if (relativePath.startsWith('reports/') && relativePath.endsWith('.md')) {
      return 'report_markdown';
    }

    if (relativePath.startsWith('reports/') && relativePath.endsWith('.json')) {
      return 'report_json';
    }

    return 'unknown';
  }

  private extractSessionId(relativePath: string): string | undefined {
    const parts = relativePath.split('/');

    if (
      parts[0] === 'plans' ||
      parts[0] === 'patch-proposals' ||
      parts[0] === 'patch-diffs' ||
      parts[0] === 'interactive-sessions' ||
      parts[0] === 'tasks' ||
      parts[0] === 'verify-runs' ||
      parts[0] === 'session-decisions'
    ) {
      return parts[1];
    }

    if (parts[0] === 'reports') {
      const fileName = parts[1];

      if (!fileName) {
        return undefined;
      }

      return fileName.replace(/\.json$|\.md$/u, '');
    }

    return undefined;
  }

  private createLabel(relativePath: string, kind: RuntimeArtifactKind): string {
    const fileName = relativePath.split('/').at(-1) ?? relativePath;

    return `${kind}: ${fileName}`;
  }

  private buildMetadata(relativePath: string, kind: RuntimeArtifactKind): JsonObject {
    return {
      kind,
      extension: path.extname(relativePath),
      directory: path.dirname(relativePath).replaceAll('\\', '/'),
    };
  }

  private createArtifactId(relativePath: string): string {
    return `artifact-${relativePath
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '')}`;
  }

  private normalizeRelativePath(value: string): string {
    const normalized = value.trim().replaceAll('\\', '/').replaceAll(/\/+/g, '/');

    if (
      normalized.length === 0 ||
      normalized.startsWith('/') ||
      normalized.includes('../') ||
      normalized === '..'
    ) {
      throw new Error('Invalid artifact path.');
    }

    return normalized;
  }
}
