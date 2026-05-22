import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LocalSnapshotManager } from '../workspace/LocalSnapshotManager.js';
import { SnapshotDiffService } from '../workspace/SnapshotDiffService.js';
import { SnapshotRestoreService } from '../workspace/SnapshotRestoreService.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const testRoot = path.resolve('.runtime/local-snapshot-manager-test');
const projectRoot = path.join(testRoot, 'project');

await rm(testRoot, {
  recursive: true,
  force: true,
});

await mkdir(path.join(projectRoot, 'src'), {
  recursive: true,
});

await writeFile(path.join(projectRoot, 'src', 'index.ts'), 'export const value = 1;\n', 'utf8');

const manager = new LocalSnapshotManager();

const created = await manager.create({
  projectRoot,
  sessionId: 'session-58-test',
  targetFiles: ['src/index.ts', 'src/new-file.ts'],
});

assert(created.manifest.files.length === 2, 'snapshot should track two files');
assert(
  created.manifest.files.some((file) => file.targetFile === 'src/index.ts' && file.existedBefore),
  'snapshot should capture existing file',
);
assert(
  created.manifest.files.some(
    (file) => file.targetFile === 'src/new-file.ts' && !file.existedBefore,
  ),
  'snapshot should track missing file',
);

await writeFile(path.join(projectRoot, 'src', 'index.ts'), 'export const value = 2;\n', 'utf8');
await writeFile(
  path.join(projectRoot, 'src', 'new-file.ts'),
  'export const created = true;\n',
  'utf8',
);

const diff = await new SnapshotDiffService().captureAfter(created.manifest);

assert(diff.changedFiles.includes('src/index.ts'), 'diff should detect changed file');
assert(diff.changedFiles.includes('src/new-file.ts'), 'diff should detect created file');

const restore = await new SnapshotRestoreService().restore(created.manifest);

assert(restore.restoredFiles.includes('src/index.ts'), 'restore should restore existing file');
assert(
  restore.deletedFiles.includes('src/new-file.ts'),
  'restore should delete file created after snapshot',
);

const restoredIndex = await readFile(path.join(projectRoot, 'src', 'index.ts'), 'utf8');

assert(restoredIndex === 'export const value = 1;\n', 'restore should recover original content');

try {
  await readFile(path.join(projectRoot, 'src', 'new-file.ts'), 'utf8');
  throw new Error('new-file.ts should not exist after restore');
} catch (error) {
  assert(
    error instanceof Error && 'code' in error && error.code === 'ENOENT',
    'new file should be deleted',
  );
}

console.log(
  JSON.stringify(
    {
      status: 'ok',
      test: 'local-snapshot-manager-test',
      snapshotId: created.manifest.snapshotId,
      files: created.manifest.files.length,
      changedFiles: diff.changedFiles,
      restoredFiles: restore.restoredFiles,
      deletedFiles: restore.deletedFiles,
      rollbackPatchPath: diff.rollbackPatchPath,
    },
    null,
    2,
  ),
);
