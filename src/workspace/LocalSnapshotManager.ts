import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path, { dirname, resolve } from 'node:path';
import { ProtectedPathPolicy } from '../security/ProtectedPathPolicy.js';
import type {
  LocalSnapshotCreateInput,
  LocalSnapshotCreateResult,
  SnapshotManifest,
  SnapshotManifestFile,
} from './SnapshotManifest.js';

export interface LocalSnapshotManagerOptions {
  pathPolicy?: ProtectedPathPolicy | undefined;
}

export class LocalSnapshotManager {
  private readonly pathPolicy: ProtectedPathPolicy;

  public constructor(options: LocalSnapshotManagerOptions = {}) {
    this.pathPolicy = options.pathPolicy ?? new ProtectedPathPolicy();
  }

  public async create(input: LocalSnapshotCreateInput): Promise<LocalSnapshotCreateResult> {
    const createdAt = new Date().toISOString();
    const snapshotId = `snapshot-${createdAt.replaceAll(':', '').replaceAll('.', '')}`;
    const projectRoot = resolve(input.projectRoot);
    const snapshotRoot = path.join(projectRoot, '.runtime', 'snapshots', input.sessionId);
    const beforeDir = path.join(snapshotRoot, 'before');
    const afterDir = path.join(snapshotRoot, 'after');
    const rollbackPatchPath = path.join(snapshotRoot, 'rollback.patch');

    await mkdir(beforeDir, {
      recursive: true,
    });

    await mkdir(afterDir, {
      recursive: true,
    });

    const files: SnapshotManifestFile[] = [];

    for (const targetFile of this.uniqueTargetFiles(input.targetFiles)) {
      const policy = await this.pathPolicy.validateTargetWithFilesystem({
        projectRoot,
        targetPath: targetFile,
        operation: 'read',
        source: 'local-snapshot-manager',
      });

      if (!policy.allowed || !policy.absoluteTargetPath) {
        throw new Error(
          `Snapshot blocked for ${targetFile}: ${policy.findings
            .map((finding) => finding.code)
            .join(', ')}`,
        );
      }

      const normalizedTarget = policy.normalizedTargetPath;
      const beforePath = path.join(beforeDir, normalizedTarget);

      try {
        const content = await readFile(policy.absoluteTargetPath, 'utf8');

        await mkdir(dirname(beforePath), {
          recursive: true,
        });

        await writeFile(beforePath, content, 'utf8');

        files.push({
          targetFile: normalizedTarget,
          beforePath,
          existedBefore: true,
          status: 'captured',
          createdAt,
        });
      } catch {
        await mkdir(dirname(beforePath), {
          recursive: true,
        });

        await writeFile(`${beforePath}.missing`, 'missing\n', 'utf8');

        files.push({
          targetFile: normalizedTarget,
          beforePath: `${beforePath}.missing`,
          existedBefore: false,
          status: 'missing',
          createdAt,
        });
      }
    }

    const manifest: SnapshotManifest = {
      version: 1,
      snapshotId,
      sessionId: input.sessionId,
      projectRoot,
      snapshotRoot,
      beforeDir,
      afterDir,
      rollbackPatchPath,
      files,
      createdAt,
      updatedAt: createdAt,
    };

    const manifestPath = this.resolveManifestPath(snapshotRoot);

    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await writeFile(rollbackPatchPath, this.buildRollbackPatch(manifest), 'utf8');

    return {
      manifest,
      manifestPath,
    };
  }

  public async readManifest(snapshotRoot: string): Promise<SnapshotManifest> {
    const manifestPath = this.resolveManifestPath(snapshotRoot);
    const raw = await readFile(manifestPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);

    if (!this.isManifest(parsed)) {
      throw new Error(`Invalid snapshot manifest: ${manifestPath}`);
    }

    return parsed;
  }

  public resolveManifestPath(snapshotRoot: string): string {
    return path.join(snapshotRoot, 'manifest.json');
  }

  private buildRollbackPatch(manifest: SnapshotManifest): string {
    const lines = [
      `# Zero Runtime rollback patch`,
      ``,
      `Snapshot: ${manifest.snapshotId}`,
      `Session: ${manifest.sessionId}`,
      `Project: ${manifest.projectRoot}`,
      `Created: ${manifest.createdAt}`,
      ``,
      `Files:`,
      ...manifest.files.map((file) => {
        return `- ${file.targetFile} (${file.existedBefore ? 'restore previous content' : 'delete created file'})`;
      }),
      ``,
    ];

    return `${lines.join('\n')}\n`;
  }

  private uniqueTargetFiles(targetFiles: string[]): string[] {
    return [...new Set(targetFiles.map((file) => file.trim()).filter((file) => file.length > 0))];
  }

  private isManifest(value: unknown): value is SnapshotManifest {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      value['version'] === 1 &&
      typeof value['snapshotId'] === 'string' &&
      typeof value['sessionId'] === 'string' &&
      typeof value['projectRoot'] === 'string' &&
      typeof value['snapshotRoot'] === 'string' &&
      typeof value['beforeDir'] === 'string' &&
      typeof value['afterDir'] === 'string' &&
      typeof value['rollbackPatchPath'] === 'string' &&
      Array.isArray(value['files']) &&
      value['files'].every((file) => this.isManifestFile(file)) &&
      typeof value['createdAt'] === 'string' &&
      typeof value['updatedAt'] === 'string'
    );
  }

  private isManifestFile(value: unknown): value is SnapshotManifestFile {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['targetFile'] === 'string' &&
      typeof value['beforePath'] === 'string' &&
      (value['afterPath'] === undefined || typeof value['afterPath'] === 'string') &&
      typeof value['existedBefore'] === 'boolean' &&
      typeof value['status'] === 'string' &&
      typeof value['createdAt'] === 'string' &&
      (value['restoredAt'] === undefined || typeof value['restoredAt'] === 'string')
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
